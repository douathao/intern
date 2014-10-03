define([
	'intern!object',
	'intern/chai!assert',
	'dojo/node!istanbul/lib/collector',
	'dojo/node!istanbul/lib/report/cobertura',
	'dojo/node!fs',
	'../../../../lib/reporters/cobertura'
], function (registerSuite, assert, Collector, Reporter, fs, cobertura) {
	var sessionId = 'foo',
		mockCoverage = {
			'test.js': {
				'path': 'test.js',
				's': {
					'1': 1
				},
				'b': {},
				'f': {},
				'fnMap': {},
				'statementMap': {
					'1': {
						'start': {
							'line': 1,
							'column': 0
						},
						'end': {
							'line': 60,
							'column': 3
						}
					}
				},
				'branchMap': {}
			}
		};

	registerSuite({
		name: 'intern/lib/reporters/cobertura',

		'File output': function () {
			try {
				cobertura['/coverage'](sessionId, mockCoverage);
				cobertura.stop();
				assert.isTrue(
					fs.existsSync('cobertura-coverage.xml'),
					'cobertura-coverage.xml file was written to disk'
				);
				assert(fs.statSync('cobertura-coverage.xml').size > 0, 'cobertura-coverage.xml contains data');
			}
			finally {
				fs.existsSync('cobertura-coverage.xml') && fs.unlinkSync('cobertura-coverage.xml');
			}
		}
	});
});
