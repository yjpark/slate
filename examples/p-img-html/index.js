import Html from 'slate-html-serializer'
import { Editor, getEventTransfer } from 'slate-react'
import { Value } from 'slate'

import React from 'react'
import styled from 'react-emotion'
import { Button, Icon, Toolbar } from '../components'

/**
 * Deserialize the initial editor value.
 *
 * @type {Object}
 */

const STORAGE_KEY_CONTENT = "content"

//const initialValue = localStorage.getItem(STORAGE_KEY_CONTENT) || '<p></p>'
const initialValue = '<p></p>'

const THROW_TAGS = ['source']

const P_TAGS = ['p', 'li']

const DIV_TAGS = [
  'div',
  'blockquote',
  'ul',
  'ol',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'footer',
]

const SPAN_TAGS = ['span', 'strong', 'em', 'u', 's', 'code']

/**
 * A styled image block component.
 *
 * @type {Component}
 */

const Image = styled('img')`
  display: block;
  max-width: 100%;
  max-height: 20em;
  box-shadow: ${props => (props.selected ? '0 0 0 2px blue;' : 'none')};
`

/**
 * Serializer rules.
 *
 * @type {Array}
 */

const RULES = [
  {
    deserialize(el, next) {
      const tag = el.tagName.toLowerCase()
      if (THROW_TAGS.includes(tag)) {
        console.log ("Throw_Away", tag, el)
        return {
          object: 'text',
          text: ''
        }
      }
    },
  },
  {
    deserialize(el, next) {
      const tag = el.tagName.toLowerCase()
      if (P_TAGS.includes(tag)) {
        return {
          object: 'block',
          type: 'paragraph',
          nodes: next(el.childNodes),
        }
      }
    },
  },
  {
    deserialize(el, next) {
      const tag = el.tagName.toLowerCase()
      if (DIV_TAGS.includes(tag)) {
        return {
          object: 'block',
          type: 'div',
          nodes: next(el.childNodes),
        }
      }
    },
  },
  {
    deserialize(el, next) {
      const tag = el.tagName.toLowerCase()
      if (SPAN_TAGS.includes(tag)) {
        return {
          object: 'inline',
          type: 'span',
          nodes: next(el.childNodes),
        }
      }
    },
  },
  {
    // Special case for images, to grab their src.
    deserialize(el, next) {
      if (el.tagName.toLowerCase() === 'img') {
        return {
          object: 'block',
          type: 'image',
          nodes: next(el.childNodes),
          data: {
            src: el.getAttribute('src'),
          },
        }
      }
    },
  },
  {
    // Special case for links, to grab their href.
    deserialize(el, next) {
      if (el.tagName.toLowerCase() === 'a') {
        return {
          object: 'inline',
          type: 'link',
          nodes: next(el.childNodes),
          data: {
            href: el.getAttribute('href'),
          },
        }
      }
    },
  },
  {
    serialize(node, children) {
      if (node.object == 'block') {
        switch (node.type) {
          case 'div':
            return <div>{children}</div>
          case 'paragraph':
            return <p>{children}</p>
          case 'image': {
            const src = node.data.get('src')
            return <Image src={src} />
          }
        }
      }
    },
  },
  {
    serialize(node, children) {
      if (node.object == 'inline') {
        switch (node.type) {
          case 'span':
            return <span>{children}</span>
          case 'link':
            return <span>{children}</span>
        }
      }
    },
  },
  {
    serialize(obj, children) {
      if (obj.object == 'mark') {
        return <span>{children}</span>
      }
    },
  },
]

/**
 * Create a new HTML serializer with `RULES`.
 *
 * @type {Html}
 */

const serializer = new Html({ rules: RULES })

function pushSegment (segments, last) {
  if (last.length > 0) {
    segments.push('<p>' + last.join(' ') + '</p>')
    last.length = 0
  }
}

function flattenNode (node, segments, last) {
  //console.log('flattenNode', node.nodeType, node.nodeName, node.nodeValue)
  if (node.nodeType == Node.TEXT_NODE) {
    last.push (node.nodeValue)
  } else if (node.nodeType == Node.ELEMENT_NODE) {
    let tag = node.nodeName.toLowerCase()
    if (tag == 'img') {
      pushSegment(segments, last)
      segments.push('<img src="' + node.src + '"/>')
    } else if (tag == 'span') {
      node.childNodes.forEach ((item, index) => {
        flattenNode (item, segments, last)
      })
    } else if (tag == 'div' || tag == 'p') {
      pushSegment(segments, last)
      node.childNodes.forEach ((item, index) => {
        flattenNode (item, segments, last)
      })
    }
  }
}

function flattenContent (node) {
  var segments = []
  var last = []
  flattenNode(node, segments, last)
  pushSegment(segments, last)
  return segments.join('')
}

/**
 * The pasting html example.
 *
 * @type {Component}
 */

class PImgHtml extends React.Component {
  state = {
    value: serializer.deserialize(initialValue),
    previewText: false,
  }
  content = initialValue
  shouldFormat = false

  formatContent = () => {
    this.preview.innerHTML = this.content
    const content = flattenContent(this.preview)
    console.log ('formatContent_From', this.content, content)
    console.log ('formatContent_To', this.content, content)
    this.content = content
    const value = serializer.deserialize(this.content)
    this.setState({ value })
    this.updatePreview (this.state.previewText)
  }

  updatePreview = (textMode) => {
    if (textMode) {
      this.preview.innerText = this.content
    } else {
      this.preview.innerHTML = this.content
    }
  }

  onChange = ({ value }) => {
    if (value.document != this.state.value.document) {
      window.lastEditorDocument = value.document
      try {
        this.content = serializer.serialize(value)
        console.log("Serialize_Succeed", this.content)
        localStorage.setItem(STORAGE_KEY_CONTENT, this.content)
        if (this.shouldFormat) {
          this.formatContent ()
        } else {
          this.updatePreview (this.state.previewText)
        }
      } catch (err) {
        console.log("Serialize_Failed", err)
      }
    }
    this.setState({ value })
  }

  /**
   * The editor's schema.
   *
   * @type {Object}G
   */

  schema = {
    blocks: {
      image: {
        isVoid: true,
      },
    },
  }

  /**
   * Store a reference to the `editor`.
   *
   * @param {Editor} editor
   */

  ref = editor => {
    this.editor = editor
  }

  refPreview = preview => {
    this.preview = preview
    this.updatePreview()
  }

  /**
   * Render.
   *
   * @return {Component}
   */

  render() {
    const { value } = this.state
    const { data } = value
    const undos = data.get('undos')
    const redos = data.get('redos')
    return (
      <div style={{ width: '100%', display: 'table', backgroundColor: '#EEEEEE' }}>
        <div style={{ display: 'table-row' }}>
          <div style={{ display: 'table-cell', width: '50%', padding: '20px' }}>
            <Toolbar>
              <Button onMouseDown={this.onClickUndo}>
                <Icon>undo</Icon>
              </Button>
              <Button onMouseDown={this.onClickRedo}>
                <Icon>redo</Icon>
              </Button>
              <span>Undos: {undos ? undos.size : 0}</span>
              <span>Redos: {redos ? redos.size : 0}</span>
              {this.renderButton('delete_selection', 'delete', 'delete', this.hasBlock)}
              {this.renderButton('toggle_preview_text', 'code', 'text', () => this.state.previewText)}
              {this.renderButton('format_content', 'format_list_bulleted', 'format', () => true)}
            </Toolbar>
            <Editor
              spellCheck
              placeholder="Paste in some HTML..."
              ref={this.ref}
              value={this.state.value}
              schema={this.schema}
              onPaste={this.onPaste}
              onChange={this.onChange}
              renderNode={this.renderNode}
              renderMark={this.renderMark}
            />
          </div>
          <div style={{ display: 'table-cell', width: '50%', backgroundColor: '#FFFFFF', padding: '20px' }}>
            <Toolbar style={{ textAlign: 'center' }}>
              <span><strong>PREVIEW</strong></span>
            </Toolbar>
            <div ref={this.refPreview} id='preview'/>
          </div>
        </div>
      </div>
    )
  }

  hasBlock = () => {
    //TODO: Fix the logic
    //return  this.state.value.blocks.length > 0
    return true
  }

  /**
   * Render a block-toggling toolbar button.
   *
   * @param {String} type
   * @param {String} icon
   * @return {Element}
   */

  renderButton = (type, icon, text, calcActive) => {
    const isActive = calcActive()
    return (
      <Button
        active={isActive}
        onMouseDown={event => this.onClickButton(event, type)}
      >
        <Icon>{icon}</Icon>
        <span>&nbsp;{text}</span>
      </Button>
    )
  }

  /**
   * When a block button is clicked, toggle the block type.
   *
   * @param {Event} event
   * @param {String} type
   */

  onClickButton = (event, type) => {
    event.preventDefault()
    console.log('onClickButton', type)
    if (type == "delete_selection") {
      if (this.hasBlock ()) {
        this.editor.delete()
      }
    } else if (type == 'toggle_preview_text') {
      const previewText = !this.state.previewText
      this.setState ({ previewText })
      this.updatePreview (previewText)
    } else if (type == 'format_content') {
      this.formatContent ()
    }
  }

  /**
   * On redo in history.
   *
   */

  onClickRedo = event => {
    event.preventDefault()
    this.editor.redo()
  }

  /**
   * On undo in history.
   *
   */

  onClickUndo = event => {
    event.preventDefault()
    this.editor.undo()
  }

  /**
   * Render a Slate node.
   *
   * @param {Object} props
   * @return {Element}
   */

  renderNode = (props, editor, next) => {
    const { attributes, children, node, isFocused } = props
    //console.log ("renderNode", node)

    switch (node.type) {
      case 'div':
        return <div>{children}</div>
      case 'span':
        return <span>{children}</span>
      case 'link':
        return <span>{children}</span>
      case 'paragraph':
        return <p>{children}</p>
      case 'image': {
        const src = node.data.get('src')
        return <Image src={src} selected={isFocused} />
      }
      default: {
        return null
        //return next()
      }
    }
  }

  /**
   * Render a Slate mark.
   *
   * @param {Object} props
   * @return {Element}
   */

  renderMark = (props, editor, next) => {
    const { children, mark, attributes } = props

    switch (mark.type) {
      case 'bold':
      case 'code':
      case 'italic':
      case 'underlined':
        return <span>{children}</span>
      default:
        return next()
    }
  }

  /**
   * On paste, deserialize the HTML and then insert the fragment.
   *
   * @param {Event} event
   * @param {Editor} editor
   */

  onPaste = (event, editor, next) => {
    const transfer = getEventTransfer(event)
    if (transfer.type !== 'html') return next()
    const { document } = serializer.deserialize(transfer.html)
    try {
      window.lastPastedHtml = transfer.html
      window.lastPastedDocument = document
      this.shouldFormat = true
      editor.insertFragment(document)
      console.log("Deserialize_Succeed", document)
    } catch (err) {
      console.log("Deserialize_Failed", err)
    }

  }
}

/**
 * Export.
 */

export default PImgHtml
