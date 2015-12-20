const React = require('react');
const { oneOf, string, bool, number, shape, arrayOf, func, object, node } = require('./PropTypes');
const { frameStyle, scrollableStyle } = require('./GoroUIStyles');
const { stringPad: pad, formatStopwatch } = require('./GoroUtils');

const PTExample = {
  full_description: string,
  failure: string,
  location: string,
};

const PTFileList = arrayOf(string);
const PTRunInfo = {
  count: number,
  passed: arrayOf(shape(PTExample)),
  pending: arrayOf(shape(PTExample)),
  failed: arrayOf(shape(PTExample)),
  scheduled: bool,
  elapsed: number,
};

const DefaultRunInfo = Object.freeze({
  count: 0,
  current: null,
  passed: [],
  pending: [],
  failed: []
});

const RunInfo = React.createClass({
  propTypes: PTRunInfo,

  getDefaultProps() {
    return Object.create(DefaultRunInfo);
  },

  render() {
    const runInfo = this.props;

    return (
      <box top={0} left="0" height={9}>
        <text tags>
          {`Examples: \t${runInfo.count}`}
          {`\nPassed:   \t${runInfo.passed.length}`}
          {`\nFailed:   \t${runInfo.failed.length}`}
          {`\nPending:  \t${runInfo.pending.length}`}
          {`\nElapsed:  \t${formatStopwatch(runInfo.elapsed / 1000)}`}

          {this.props.children}
        </text>
      </box>
    );
  }
});

const Failures = React.createClass({
  propTypes: PTRunInfo,

  getDefaultProps() {
    return Object.create(DefaultRunInfo);
  },

  render() {
    return (
      <box
        top={0} left={0} width="100%" height="100%" {...frameStyle}
        label="{bold}Failures{/bold}"
        tags
      >
        <log
          scrollOnInput={false}
          tags
          {...scrollableStyle}
          content={this.props.failed.map(this.renderFailure).join('\n')}
        />
      </box>
    )
  },

  renderFailure(example, index) {
    return pad([
      `${example.full_description}:`,
      `{red-fg}${pad(example.failure, 4)}{/}`,
      `{cyan-fg}# ${example.location}{/}\n`,
    ].join('\n'), 4).replace(/^\s{2}/, `${index+1})`);
  }
});

const Checkbox = React.createClass({
  propTypes: {
    checked: bool,
  },

  componentWillUpdate(nextProps) {
    this.refs.checkbox.checked = nextProps.checked;
  },

  render() {
    return <checkbox ref="checkbox" {...this.props} />
  }
});

const ControlElement = React.createClass({
  statics: {
    position: 0,
    padding: 2,
  },

  propTypes: {
    caption: string,
    binding: string,
    spacing: number,
    children: node,
  },

  getDefaultProps: function() {
    return {
      spacing: 1,
      binding: '',
      caption: ''
    };
  },

  componentWillMount() {
    const { padding } = this.constructor;

    this.captionWidth = this.props.caption.length + padding;
    this.bindingWidth = this.props.binding.length;

    this.width = this.bindingWidth + this.captionWidth + this.props.spacing;
    this.position = this.constructor.position;
    this.constructor.position += this.width;
  },

  componentWillUnmount: function() {
    this.constructor.position -= this.width;
  },

  render() {
    const { width, bindingWidth, captionWidth } = this;
    const style = { bg: 'white', fg: 'black' };

    const binding = {
      width: bindingWidth,
      style: { bg: 'red', fg: 'white' }
    };

    const caption = {
      shrink: true,
      left: bindingWidth,
      width: captionWidth,
      style
    };

    return (
      <element left={this.position} width={width}>
        <text {...binding}>{this.props.binding}</text>
        <text {...caption}> {this.props.caption} </text>

        {this.props.children && (
          <element left={width - this.props.spacing}>
            {this.props.children}
          </element>
        )}
      </element>
    );
  }
});

const Controls = React.createClass({
  propTypes: {
    focus: bool,
    failFast: bool,
  },

  render() {
    return (
      <element top="center" left="0">
        <ControlElement binding="TAB" caption="NEXT PANEL" />
        <ControlElement binding="F4" caption="CLEAR" />
        <ControlElement binding="F5" caption="FOCUS" spacing={4}>
          <Checkbox
            checked={this.props.focus}
          />
        </ControlElement>
        <ControlElement binding="F6" caption="FAIL-FAST" spacing={4}>
          <Checkbox
            checked={this.props.failFast}
          />
        </ControlElement>
        <ControlElement binding="/" caption="GREP" />
        <ControlElement binding="F12" caption="DEBUG" />
      </element>
    );
  }
});

const Grep = React.createClass({
  propTypes: {
    onGrep: func.isRequired,
    onDismiss: func.isRequired,
  },

  componentDidMount() {
    const widget = this.refs.widget;

    if (widget) {
      widget.focus();
    }
  },

  render() {
    return (
      <element>
        <text width={6}>Grep:</text>
        <textbox
          ref="widget"
          left={6}
          inputOnFocus
          onSubmit={this.props.onGrep}
          onCancel={this.props.onDismiss}
        />
      </element>
    )
  }
});

const WatchList = React.createClass({
  propTypes: {
    fileList: PTFileList
  },

  render() {
    if (this.props.fileList.length === 0) {
      return (
        <text style={{ fg: 'blue' }}>
          You are not watching any files yet. Edit a test file to watch.
        </text>
      );
    }

    return (
      <list mouse items={this.props.fileList} />
    );
  }
});

const Console = React.createClass({
  propTypes: {
    messages: arrayOf(string),
  },

  render() {
    return (
      <log
        scrollOnInput={false}
        top="0"
        left="0"
        width="100%"
        height="100%"
        label="Console"
        {...frameStyle}
        {...scrollableStyle}
        content={this.props.messages.join('\n')}
      />
    )
  }
});

const Progress = React.createClass({
  propTypes: PTRunInfo.isRequired,

  getDefaultProps() {
    return Object.create(DefaultRunInfo);
  },

  render() {
    const { props } = this;
    const ratio = props.count === 0 ? 0 : Math.ceil(
      (props.passed.length + props.pending.length + props.failed.length) / props.count * 100
    );

    const color = props.failed.length > 0 ? 'red' : 'green';

    return (
      <progressbar
        orientation="horizontal"
        filled={ratio}
        top="0"
        left="0"
        height="100%"
        width="100%"
        border={{}}
        style={{
          bg: 'gray',
          bar: {
            bg: color
          }
        }}
      />
    );
  }
})

// Rendering a simple centered box
const App = React.createClass({
  propTypes: {
    fileList: PTFileList,
    runInfo: shape(PTRunInfo),
    scheduled: bool,
    grepping: bool,
    onGrep: func,
    onDismissGrep: func,
    config: object,
    focus: bool,
    failFast: bool,
    activePanel: oneOf([ 'failures', 'console' ]),
    stdout: arrayOf(string),
    stderr: arrayOf(string),
  },

  getDefaultProps: function() {
    return {
      activePanel: 'failures',
      stdout: [],
      stderr: [],
      fileList: [],
      runInfo: Object.create(DefaultRunInfo)
    };
  },

  render() {
    return (
      <box top="0" left="0" width="100%" height="100%">
        <box top="0" left="0" width="30%" height="60%" label="Watched Files" {...frameStyle}>
          <WatchList fileList={this.props.fileList} />
        </box>

        <box top="60%" left="0" width="30%" height="30%" label="Last Run" {...frameStyle}>
          <RunInfo {...this.props.runInfo}>
            {this.props.scheduled && (
              "\n{yellow-fg}SCHEDULED FOR ANOTHER RUN{/}"
            )}
          </RunInfo>
        </box>

        <box top={0} left="30%" width="70%" height="100%-6">
          {this.props.activePanel === 'failures' && (
            <Failures {...this.props.runInfo} />
          )}

          {this.props.activePanel === 'console' && (
            <Console messages={this.props.stdout.concat(this.props.stderr)} />
          )}
        </box>

        <element left={0} bottom={1} width="100%" height={5}>
          <Progress {...this.props.runInfo} />
        </element>

        <box bottom={0} left={0} width="100%" height={1}>
          {this.props.grepping ? (
            <Grep onGrep={this.props.onGrep} onDismiss={this.props.onDismissGrep} />
          ) : (
            <Controls
              focus={this.props.focus}
              failFast={this.props.failFast}
            />
          )}
        </box>
      </box>
    );
  }
});

const Injector = React.createClass({
  getInitialState() {
    return this.props || {};
  },

  render() {
    return <App {...this.state} />
  },

  inject(props) {
    this.setState(props);
  }
});

module.exports = Injector;
