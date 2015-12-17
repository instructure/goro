const React = require('react');
const { string, bool, number, shape, arrayOf, func, object } = require('react-schema').PropTypes;
const { frameStyle, scrollableStyle } = require('./GoroUIStyles');

const PTExample = {
  full_description: string,
  failure: string,
  location: string,
};

const PTFileList = arrayOf(string);
const PTRunInfo = {
  count: number,
  passed: arrayOf(shape(PTExample)),
  failed: arrayOf(shape(PTExample)),
  scheduled: bool,
};

const RunInfo = React.createClass({
  propTypes: PTRunInfo,

  getDefaultProps: function() {
    return {
      count: 0,
      current: null,
      passed: [],
      failed: []
    };
  },

  render() {
    const { props } = this;
    const progress = props.count === 0 ? 0 : Math.ceil(
      (props.passed.length + props.failed.length) / props.count * 100
    );

    const progressColor = props.failed.length > 0 ? 'red' : 'green';

    return (
      <element>
        <box top={0} left="0" width="100%" height={3} {...frameStyle}>
          <text height={1} tags>
            Examples: {this.props.count}
            {'\t'}
            Passed: {this.props.passed.length}
            {'\t'}
            Failed: {this.props.failed.length}

            {this.props.scheduled && (
              "\t{yellow-fg}SCHEDULED FOR ANOTHER RUN{/}"
            )}
          </text>
        </box>

        <box
          top={8} left="0" width="100%" height="100%-8" {...frameStyle}
          label="{bold}Failures{/bold}" tags>

          <log
            tags
            {...scrollableStyle}
            content={props.failed.map(this.renderFailure).join('\n')}
          />
        </box>

        <progressbar
          orientation="horizontal"
          filled={progress}
          top={3}
          left="0"
          height={5}
          width="100%"
          border={{}}
          style={{
            bg: 'gray',
            bar: {
              bg: progressColor
            }
          }}
        />
      </element>
    );
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

const Controls = React.createClass({
  propTypes: {
    focus: bool,
    failFast: bool,
  },

  render() {
    const style = { bg: 'cyan', fg: 'black' };
    const width = 15;
    const bindingWidth = 3;
    const captionWidth = 8;

    const binding = {
      width: bindingWidth,
      style: { bg: 'black' }
    };
    const caption = {
      shrink: true,
      left: bindingWidth,
      width: captionWidth,
      style
    };

    return (
      <element top="center" left="0">
        <element left="0" width={width}>
          <text {...binding}>F4</text>
          <button {...caption}>
            CLEAR
          </button>
        </element>

        <element left={width} width={width}>
          <text {...binding}>F5</text>
          <text {...caption}>FOCUS</text>

          <Checkbox
            left={bindingWidth+captionWidth}
            checked={this.props.focus}
          />
        </element>

        <element left={width*2} width={width}>
          <text {...binding}>F6</text>
          <text {...caption}>FAILFAST</text>

          <Checkbox
            left={bindingWidth+captionWidth}
            checked={this.props.failFast}
          />
        </element>

        <element left={width*3} width={width}>
          <text {...binding}> / </text>
          <text {...caption}>GREP</text>
        </element>

        <element left={width*4} width={width}>
          <text {...binding}>F12</text>
          <text {...caption}>DEBUG</text>
        </element>
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

// Rendering a simple centered box
const App = React.createClass({
  propTypes: {
    fileList: PTFileList,
    runInfo: shape(PTRunInfo),
    scheduled: bool,
    messages: arrayOf(string),
    grepping: bool,
    onGrep: func,
    onDismissGrep: func,
    config: object,
    focus: bool,
    failFast: bool,
  },

  getDefaultProps: function() {
    return {
      messages: [],
      runInfo: {},
      fileList: [],
    };
  },

  render() {
    return (
      <box top="0" left="0" width="100%" height="100%">
        <box top="0" left="0" width="30%" height="60%" label="Watched Files" {...frameStyle}>
          <WatchList fileList={this.props.fileList} />
        </box>

        <box top="0%" left="30%" width="70%" height="100%-1">
          <RunInfo {...this.props.runInfo} scheduled={this.props.scheduled} />
        </box>

        <log
          top="60%"
          left="0"
          width="30%"
          height="40%"
          label="Console"
          {...frameStyle}
          {...scrollableStyle}
          content={this.props.messages.join('\n')}
        />

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

function pad(str, padding) {
  var ws = Array(padding).join(' ');

  return str.split('\n').map(function(line) {
    return ws + line;
  }).join('\n');
}
