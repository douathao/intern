define([
	'intern!object',
	'intern/chai!assert',
	'dojo/node!fs',
	'../../../../lib/Test',
	'../../../../lib/reporters/combined'
], function (registerSuite, assert, fs, Test, reporter) {

	if (typeof console !== 'object') {
		// IE<10 does not provide a global console object when Developer Tools is turned off
		return;
	}

	function mockConsole(method, callback) {
		var oldMethod = console[method];
		console[method] = callback;
		return {
			remove: function () {
				console[method] = oldMethod;
			}
		};
	}

	registerSuite({
		name: 'intern/lib/reporters/combined',

		'start': function () {
			var actualMessage,
				handle = mockConsole('log', function (message) {
					actualMessage = message;
				});

			try {
				reporter.start();
				assert.strictEqual(actualMessage, 'Running client tests…');
			} finally {
				handle.remove();
			}
		},

		'/session/start': function () {
			var actualMessage,
				handle = mockConsole('log', function (message) {
					actualMessage = message;
				}),
				remote = {
					environmentType: 'node'
				};

			try {
				reporter['/session/start'](remote);
				assert.strictEqual(actualMessage, 'Testing ' + remote.environmentType);
			} finally {
				handle.remove();
			}
		},

		'/error': function () {
			var result = [],
				error = new Error('Oops'),
				handle = mockConsole('error', function () {
					result = result.concat([].slice.call(arguments, 0));
				});

			try {
				reporter['/error'](error);
				assert.strictEqual(result.length, 1, 'Reporter should log a messages for a error');
				result = result.join('\n');
				assert.include(result, 'Oops', 'Reporter should include the message from the error');
			} finally {
				handle.remove();
			}
		},

		'/tunnel/start': function () {
			var actualMessage,
				handle = mockConsole('log', function (message) {
					actualMessage = message;
				});

			try {
				reporter['/tunnel/start']();
				assert.strictEqual(actualMessage, 'Starting tunnel');
			} finally {
				handle.remove();
			}
		},

		'/tunnel/download/progress': function () {
			var actualMessage,
				handle = mockConsole('log', function (message) {
					actualMessage = message;
				}),
				tunnel = null,
				progress = {
					received: 50,
					total: 100
				};

			try {
				reporter['/tunnel/download/progress'](tunnel, progress);
				assert.strictEqual(
					actualMessage,
					'Download ' + (progress.received / progress.total * 100) + '% complete'
				);
			} finally {
				handle.remove();
			}
		},

		'/tunnel/status': function () {
			var actualMessage,
				handle = mockConsole('log', function (message) {
					actualMessage = message;
				}),
				tunnel = null,
				status = 'success';

			try {
				reporter['/tunnel/status'](tunnel, status);
				assert.strictEqual(actualMessage, 'Tunnel: ' + status);
			} finally {
				handle.remove();
			}
		},

		'/test/fail': function () {
			var result = [],
				handle = mockConsole('error', function () {
					result = result.concat([].slice.call(arguments, 0));
				}),
				test = new Test({name: 'test', error: new Error('Oops')});

			try {
				reporter['/test/fail'](test);
				assert.strictEqual(result.length, 2, 'Reporter should log two messages for a fail test');
				result = result.join('\n');
				assert.match(result, /FAIL/, 'Reporter should indicate that a fail error occurred');
				assert.include(result, 'Oops', 'Reporter should include the message from the error');
			} finally {
				handle.remove();
			}

		}
	});
});
