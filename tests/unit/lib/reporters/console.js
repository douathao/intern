define([
	'intern!object',
	'intern/chai!assert',
	'dojo/lang',
	'../../../../lib/Suite',
	'../../../../lib/Test',
	'../../../../lib/reporters/console'
], function (registerSuite, assert, lang, Suite, Test, reporter) {
	if (typeof console !== 'object') {
		// IE<10 does not provide a global console object when Developer Tools is turned off
		return;
	}

	var hasGrouping = 'group' in console && 'groupEnd' in console;

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
		name: 'intern/lib/reporters/console',

		'/suite/start': function () {
			if (!hasGrouping) {
				return;
			}

			var called = false,
				suite = new Suite({ name: 'suite' }),
				handle = mockConsole('group', function (message) {
					called = true;
					assert.strictEqual(
						message,
						suite.name,
						'console.group should be called with the name of the suite'
					);
				});

			try {
				reporter['/suite/start'](suite);
				assert.isTrue(called, 'console.group should be called when the reporter /suite/start method is called');
			}
			finally {
				handle.remove();
			}
		},

		'/suite/end': (function () {
			var suite = {
				'successful suite': function () {
					var actualMessage,
						suite = new Suite({ name: 'suite', tests: [ new Test({ hasPassed: true }) ] }),
						handle = mockConsole('info', function (message) {
							actualMessage = message;
						});

					try {
						reporter['/suite/end'](suite);
						assert.ok(
							actualMessage,
							'console.info should be called when the reporter ' +
							'/suite/end method is called and there are no errors'
						);
						assert.match(
							actualMessage,
							new RegExp('^' + suite.numFailedTests + '/' + suite.numTests + ' '),
							'console.info message should say how many tests failed and how many total tests existed');
					}
					finally {
						handle.remove();
					}
				},

				'failed suite': function () {
					var actualMessage,
						suite = new Suite({ name: 'suite', tests: [ new Test({ hasPassed: false }) ] }),
						handle = mockConsole('warn', function (message) {
							actualMessage = message;
						});

					try {
						reporter['/suite/end'](suite);
						assert.ok(
							actualMessage,
							'console.warn should be called when the reporter ' +
							'/suite/end method is called and there are errors'
						);
						assert.match(
							actualMessage,
							new RegExp('^' + suite.numFailedTests + '/' + suite.numTests + ' '),
							'console.warn message should say how many tests passed and how many total tests existed');
					}
					finally {
						handle.remove();
					}
				}
			};

			if (hasGrouping) {
				var groupHandle;
				lang.mixin(suite, {
					setup: function () {
						groupHandle = mockConsole('groupEnd', function () {
							// no-op to prevent code under test from calling `console.groupEnd` to close this
							// test group
						});
					},

					teardown: function () {
						groupHandle.remove();
					},

					'grouping': function () {
						var called = false,
							suite = new Suite({ name: 'suite' }),
							handles = [
								mockConsole('groupEnd', function (name) {
									called = true;
									assert.strictEqual(
										name,
										suite.name,
										'console.groupEnd should be called with the name of the suite'
									);
								}),
								mockConsole('info', function () {
									// no-op to prevent code from intercepting the /group/end topic and emitting test
									// pass information for the fake suite
								})
							];

						try {
							reporter['/suite/end'](suite);
							assert.isTrue(
								called,
								'console.group should be called when the reporter /suite/end method is called'
							);
						}
						finally {
							var handle;
							while ((handle = handles.pop())) {
								handle.remove();
							}
						}
					}
				});
			}

			return suite;
		})(),

		'/error': function () {
			var result = [],
				error = new Error('Oops'),
				handles = [
					mockConsole('warn', function () {
						result = result.concat([].slice.call(arguments, 0));
					}),
					mockConsole('error', function () {
						result = result.concat([].slice.call(arguments, 0));
					})
				];

			try {
				reporter['/error'](error);

				assert.strictEqual(result.length, 2, 'Reporter should log two messages for a fatal error');
				result = result.join('\n');
				assert.match(result, /\bFATAL ERROR\b/, 'Reporter should indicate that a fatal error occurred');
				assert.include(result, 'Oops', 'Reporter should include the message from the error');

				if (result.indexOf('No stack or location') === -1) {
					assert.include(
						result,
						'tests/unit/lib/reporters/console.js:159',
						'Reporter should indicate the location of the error'
					);
				}
			}
			finally {
				var handle;
				while ((handle = handles.pop())) {
					handle.remove();
				}
			}
		},

		'/test/pass': function () {
			var test = new Test({
					name: 'test',
					timeElapsed: 123,
					parent: { name: 'parent', id: 'parent' },
					hasPassed: true
				}),
				handle = mockConsole('log', function (message) {
					assert.match(message, /\bPASS\b/, 'Reporter should indicate that a test passed');
					assert.include(
						message,
						hasGrouping ? test.name : test.id,
						'Reporter should indicate which test passed'
					);
					assert.include(
						message,
						test.timeElapsed + 'ms',
						'Reporter should indicate the amount of time the test took'
					);
				});

			try {
				reporter['/test/pass'](test);
			}
			finally {
				handle.remove();
			}
		},

		'/test/fail': function () {
			var result = [],
				test = new Test({
					name: 'test',
					timeElapsed: 123,
					parent: { name: 'parent', id: 'parent' },
					error: new Error('Oops')
				}),
				handles = [
					mockConsole('log', function () {
						result = result.concat([].slice.call(arguments, 0));
					}),
					mockConsole('error', function () {
						result = result.concat([].slice.call(arguments, 0));
					})
				];

			try {
				reporter['/test/fail'](test);
				assert.strictEqual(result.length, 2, 'Reporter should log two messages for a failed test');
				result = result.join('\n');
				assert.match(result, /\bFAIL\b/, 'Reporter should indicate that a test failed');
				assert.include(result, hasGrouping ? test.name : test.id, 'Reporter should indicate which test failed');
				assert.include(
					result,
					test.timeElapsed + 'ms',
					'Reporter should indicate the amount of time the test took'
				);
			}
			finally {
				var handle;
				while ((handle = handles.pop())) {
					handle.remove();
				}
			}
		},

		'/test/skip': function () {
			var result = '',
				test = new Test({
					name: 'test',
					skipped: 'skip'
				}),
				handle = mockConsole('log', function (string) {
					result = string;
				});

			try {
				reporter['/test/skip'](test);
				assert.strictEqual(result, 'SKIP: test (skip)', 'Reporter should log a messages for a skipped test');
				assert.include(
					result,
					hasGrouping ? test.name : test.id,
					'Reporter should indicate which test skipped'
				);
			}
			finally {
				handle.remove();
			}
		},

		'/suite/test/skip': function () {
			var actualMessage,
				suite = new Suite({ name: 'suite', tests: [ new Test({ name: 'test', skipped: 'skip'}) ] }),
				handle = mockConsole('info', function (message) {
					actualMessage = message;
				});

			try {
				reporter['/suite/end'](suite);
				assert.ok(
					actualMessage,
					'console.info should be called when the reporter ' +
					'/suite/end method is called and there is a skipped test'
				);
				assert.match(
					actualMessage,
					new RegExp('(' + suite.numSkippedTests + ')'),
					'console.info message should say how many tests skipped'
				);
			}
			finally {
				handle.remove();
			}
		}
	});
});
