// --- Simple, safe patterns ---

const digits = /\d+/; // basic number matcher
const email = /^[\w.-]+@[\w.-]+\.[A-Za-z]{2,}$/; // typical email pattern
const whitespace = new RegExp('\\s+', 'g'); // RegExp constructor style
const nonWhitespace = RegExp('[^\\s]+', 'g'); // RegExp function call style
const hexColor = /^#(?:[A-Fa-f0-9]{3}){1,2}$/; // 3- or 6-digit hex colors

// --- Patterns with flags ---

const caseInsensitive = /hello world/i;
const multilineExample = /^start.*end$/m;
const globalFlagTest = /\bword\b/g;

// --- Potentially unsafe / ReDoS-prone patterns ---

// Catastrophic backtracking: nested quantifiers on overlapping tokens
const redos1 = /^(a+)+$/;

// Another one: ambiguous alternation with repetition
const redos2 = /(a|aa)+$/;

// Complex nested groups and wildcards
const redos3 = /(x+x+)+y/;

// Real-world variant of a ReDoS-prone pattern (email-like)
const redos4 = /^([a-zA-Z0-9_.+-]+)+@(([a-zA-Z0-9-])+.)+[a-zA-Z0-9]{2,4}$/;

// --- Escaped and multiline construction ---

const pathRegex = new RegExp('^([A-Z]:\\\\)?(\\\\[A-Za-z_\\-\\s0-9\\.]+)+\\\\?$', 'i');

const multiLineBuild = new RegExp(
    [
        '^\\d{4}-', // year
        '\\d{2}-', // month
        '\\d{2}$', // day
    ].join(''),
);

// --- Template string usage (edge case for detection) ---

const templatePattern = new RegExp(`^item-(\\d+)-${process.env.NODE_ENV}$`);

// --- False positives to ensure you handle non-regex strings ---

const notARegex1 = '/*.css'; // should NOT be treated as a regex
const notARegex2 = '/api/v1/users'; // a URL path, not a regex
const notARegex3 = 'Some text with /slashes/ inside';

// --- Complex realistic patterns ---

const ipv4 =
    /^(25[0-5]|2[0-4]\d|[01]?\d\d?)\.((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){2}(25[0-5]|2[0-4]\d|[01]?\d\d?)$/;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// --- Example with unusual escaping and nested character classes ---

const tricky = /[a-zA-Z0-9_\-\\[\]]+/;

// --- Optional advanced ReDoS pattern ---

const catastrophicURL = /(https?:\/\/(w{3}\.)?)+[a-zA-Z0-9\-]+\.[a-z]+(\/[^\s]*)*/;

// --- Forcing a regex discovery with a comment directive ---
/**
 * @regex
 */
const treatAsRegex = 'some_regex_pattern_string';
const alsoTreatAsRegex = /** @regex */ 'some_regex_pattern_string';

const test = /wa/g;

export {};
