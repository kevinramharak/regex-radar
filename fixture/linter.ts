// regex-radar(no-regex-spaces)
const spaces = /   some  text  with      spaces   /g;
const spaces_fn = RegExp('   some  text  with      spaces   ', 'g');
const spaces_new = new RegExp('   some  text  with      spaces   ', 'g');
/**
 * @regex
 */
const spaces_string = '   some  text  with      spaces   ';
const spaces_string_inline = /** @regex */ '   some  text  with      spaces   ';

// regex-radar(prefer-regex-new-expression)
const prefer_new_fn = RegExp('pattern', 'g');

// regex-radar(prefer-regex-literals)
const prefer_literal_fn = RegExp('pattern', 'g');
const prefer_literal_new = new RegExp('pattern', 'g');

// regex-radar(no-control-regex)
const literal_x_null = /\x00/;
const literal_x_control = /\x0C/;
const literal_x_seperator = /\x1F/;
const literal_u_control = /\u000C/;
// TODO: what even is this
const literal_u_control_unicode_flag = /\u{C}/u;
const new_control = new RegExp('\x0C'); // raw U+000C character in the pattern
const new_control_escape = new RegExp('\\x0C'); // \x0C pattern

// regex-radar(no-invalid-regexp)

const invalid_pattern_new = new RegExp('[');
const invalid_flag_new = RegExp('.', 'z');
const invalid_new_escape = new RegExp('\\');
