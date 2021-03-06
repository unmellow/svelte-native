self.window = self; // egregious hack to get magic-string to work in a worker

let fulfil_ready;
const ready = new Promise(f => {
	fulfil_ready = f;
});

self.addEventListener('message', async event => {
	switch (event.data.type) {
		case 'init':
			importScripts(
				event.data.version === 'local' ?
					'/repl/local?file=compiler.js' :
					`https://unpkg.com/svelte@${event.data.version}/compiler.js`,
				    `https://unpkg.com/svelte-native-preprocessor@0.1.8/dist/index.js`
			);
			fulfil_ready();
			break;

		case 'compile':
			await ready;
			postMessage(await compile(event.data));
			break;

	}
});

const commonCompilerOptions = {
	dev: false,
	css: false
};

async function compile({ id, source, options, entry }) {
	try {

		let code = await svelte.preprocess(source, svelteNativePreprocessor())
		const { js, css, stats, vars } = svelte.compile(
			code.toString(),
			Object.assign({}, commonCompilerOptions, options)
		);

		return {
			id,
			result: {
				js: js.code,
				css: css.code || `/* Add a <sty` + `le> tag to see compiled CSS */`
			}
		};
	} catch (err) {
		let message = `/* Error compiling component\n\n${err.message}`;
		if (err.frame) message += `\n${err.frame}`;
		message += `\n\n*/`;

		return {
			id,
			result: {
				js: message,
				css: message
			}
		};
	}
}
