// regex-radar(redos-polynomial)
const redos_polynomial_2nd_degree = /(https?:\/\/(w{3}\.)?)+[a-zA-Z0-9\-]+\.[a-z]+(\/[^\s]*)*/;

// regex-radar(redos-exponential)
const redos_exponential_1 = /^(a+)+$/;
const redos_exponential_2 = /(a|aa)+$/;
const redos_exponential_3 = /(x+x+)+y/;
const redos_exponential_4 = /^([a-zA-Z0-9_.+-]+)+@(([a-zA-Z0-9-])+.)+[a-zA-Z0-9]{2,4}$/;
const redos_exponential_5 = new RegExp('^([A-Z]:\\\\)?(\\\\[A-Za-z_\\-\\s0-9\\.]+)+\\\\?$', 'i');
