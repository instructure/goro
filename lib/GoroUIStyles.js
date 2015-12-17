exports.frameStyle = {
  style: {
    // bg: 'gray',
    label: {
      bg: 'gray',
      bold: true
    },
    border: {
      fg: 'gray'
    }
  },
  border: {
    type: 'line'
  }
};

exports.scrollableStyle = {
  keys: true,
  vi: true,
  mouse: true,
  scrollbar: {
    ch: ' ',
    track: {
      bg: 'yellow'
    },
    style: {
      inverse: true
    }
  }
};
