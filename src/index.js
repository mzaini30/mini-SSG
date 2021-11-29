#!/usr/bin/env node

const {minify} = require('html-minifier')
const fs = require('fs-extra')
const path = require('path');

const {existsSync} = require('fs')

const md = require('markdown-it')()
const shiki = require('markdown-it-shiki').default

// zen
let konten

md.use(shiki, {
	theme: 'nord'
})

const {exec} = require('child_process')
let windi
if (process.argv.includes('--watch')) {
	windi = "windicss './dev/pages/**/*.html' './dev/layouts/**/*.html' './dev/components/**/*.html' './dev/imports/**/*.html' -to './dev/static/windi.css' --style"
} else {
	windi = "windicss './dev/pages/**/*.html' './dev/layouts/**/*.html' './dev/components/**/*.html' './dev/imports/**/*.html' -mto './dev/static/windi.css' --style"
}

const dir = {
	static: "./dev/static",
	pages : "./dev/pages",
	layout : "./dev/layouts",
	import : "./dev/imports",
	component : "./dev/components",
	public : "./public"
}

const patterns = {
	codeTag: /(<code([\S\s]*?)>([\S\s]*?)<\/code>)/g,
	import: /@import\((.*?)\)/g,
	layout: /@layout\((.*?)\)/g,
	attach: /@attach\((.*?)\)/g,
	section : /(@section)([\S\s]*?)(@endsection)/gi,
	simpleSection: /(@section\()(.*?),(.*?)(\))/g,
	component: /(@component)([\S\s]*?)(@endcomponent)/g,
	slot: /(@slot)([\S\s]*?)(@endslot)/g,
	markdown: /(@markdown)([\S\s]*?)(@endmarkdown)/g,
	windi: /(<style lang=.windi.>)([\S\s]*?)(<\/style>)/g,
}


function runSSG() { 

let codeTagHolder = []

//Pages file
const pages = fs.readdirSync(dir.pages)

if (!process.argv.includes('--watch')) {
	fs.emptyDirSync(dir.public)
}

createFolderIfNone(dir.public)
pages.forEach(function(page) {
	generateFile(`${dir.pages}/${page}`, page)
})

//Static folder
exec(windi, () => {
	fs.copy(dir.static, './public/')
		.then(() => {/*console.log('success!')*/})
		.catch(err => err)
})

function buatSitemap(situs){
	const recursive = require('recursive-readdir-sync')
	const { SitemapManager } = require('sitemap-manager')

	let files = recursive('public')
	files = ['public/', ...files]
	files = files.map(x => x.replace(/^public/, situs))

	let filesRapi = []
	files = files.forEach(x => {
		filesRapi = [...filesRapi, {
			loc: x,
			lastmod: new Date(),
			changefreq: 3,
			priority: 0.5
		}]
	})

	const MySitemap = new SitemapManager({
		siteURL: situs
	})

	MySitemap.addUrl('mini', filesRapi)
	MySitemap.finish()
}

function generateFile(item, fileName) {	
	//check if DIR
	if(fs.statSync(item).isDirectory()) { 
		return generatePageSubFolder(item)
	}

	//restart for new files
	codeTagHolder = [] 

	let content = readFile(item)

	const ext = path.extname(fileName);
	if(ext == ".html") {
		// zen
		konten = content
		renderPage()
		content = konten
		
		const folder = fileName.split('.')[0] //get name with subfolder
		
		//except index, no folder.
		if(folder != 'index') {
			// createFolderIfNone('./public/'+folder)
			// fileName = folder + '/index.html'
			fileName = folder + '.html'
		}
	}

	const cekAttachKosong = content.match(patterns.attach)
	if (cekAttachKosong != null) {
		content = content.replace(patterns.attach, '')
	}

	if (!process.argv.includes('--watch')) {
		const cekWindi = content.match(patterns.windi)
		if (cekWindi != null) {
			content = content.replace(patterns.windi, '')
		}

		content = minify(content, {
			collapseWhitespace: true,
			removeComments: true
		})

		let situs = ''
		if (existsSync('./mini.json')){
			const ambilConfig = require('read-json-sync')('mini.json')
			if (ambilConfig.situs){
				buatSitemap(ambilConfig.situs)
			}
		}
	}

	//save to new Dir
	fs.writeFileSync(`./public/${fileName}`, content)
	return
}

function generatePageSubFolder(item) {
	let subFolder = item.replace('./dev/pages/', '')

	const subPages = fs.readdirSync(item)
	createFolderIfNone(`./public/${subFolder}`)

	subPages.forEach(function(page) {
		generateFile(`${dir.pages}/${subFolder}/${page}`, `${subFolder}/${page}`)
	})

	return
}

function renderMarkdown(teks){
	let pecahBaris = teks.split('\n')
	pecahBaris = pecahBaris.filter((x, n) => n != 0)

	let karakterHarusLenyap = pecahBaris[0].match(/^\s+/)
	// hasil: ["\t\t"]
	karakterHarusLenyap = karakterHarusLenyap ? new RegExp(`^${karakterHarusLenyap[0]}`, 'g') : ''

	teks = teks.split('\n').map(x => x.replace(karakterHarusLenyap, '')).join('\n')

	return md.render(teks).replace(/@/g, '&commat;')
}

function renderPage() {

	const dapatMarkdown = konten.match(patterns.markdown)
	if (dapatMarkdown != null) {
		konten = konten.replace(patterns.markdown, function(match, p1, p2){
			return renderMarkdown(p2)
		})

		if (konten.match(patterns.markdown) != null){
			renderPage()				
		} else {
			cekLagi()
		}		
	}
	
	//Render Layout
	// zen
	const layoutLabel = konten.match(patterns.layout)
	if(layoutLabel != null) {
		konten = konten.replace(patterns.layout, renderTag.bind(this, 'layout'))

	}
	konten = maskCodeTag(konten)

	//Render simple section
	const simpleSectionLabels = konten.match(patterns.simpleSection)
	if(simpleSectionLabels != null) {
		simpleSectionLabels.forEach(function(match){
			konten = konten.replace(patterns.attach, renderSimpleSection.bind(this, konten))
		})

		// zen
		if (konten.match(patterns.simpleSection) != null){
			renderPage()				
		}	else {
			konten = konten.replace(patterns.simpleSection, '')
			cekLagi()
		}	

		// konten = konten.replace(patterns.simpleSection, '')
	}

	//Render complex section / swap attach & section
	// zen
	const attachLabels = konten.match(patterns.attach)
	if(attachLabels != null) {
		attachLabels.forEach(function(match){
			konten = konten.replace(patterns.attach, renderLayout.bind(this, konten))

		})

		if (konten.match(patterns.layout) != null){
			renderPage()				
		} else {
			konten = konten.replace(patterns.section, '')
			cekLagi()
		}		

		// zen
		// konten = konten.replace(patterns.section, '')

	}

	//Render Import pages
	const importLabels = konten.match(patterns.import)
	if(importLabels != null) {
		importLabels.forEach(function(match){
			konten = konten.replace(patterns.import, renderTag.bind(this, 'import'))
		})

		if (konten.match(patterns.import) != null){
			renderPage()				
		}	else {
			cekLagi()
		}	
	}

	//Render components
	const componentLabels = konten.match(patterns.component)
	if(componentLabels != null) {
		componentLabels.forEach(function(match){
			konten = konten.replace(patterns.component, renderComponent.bind(this, konten))
		})

		if (konten.match(patterns.component) != null){
			renderPage()				
		} else {
			cekLagi()
		}		
	}

	// zen
	function cekLagi(){
		if (
			konten.match(patterns.markdown) != null || 
			konten.match(patterns.simpleSection) != null ||
			konten.match(patterns.layout) != null ||
			konten.match(patterns.import) != null ||
			konten.match(patterns.component) != null
		) {
			renderPage()
		} else {
			konten = unMaskCodeTag(konten.trim())
		}
	}

	// return unMaskCodeTag(konten.trim())

}



function maskCodeTag(content) {
	const codeTags = content.match(patterns.codeTag)
	if(codeTags != null) {
		codeTags.forEach(function(match){
			let newHolder = 'code-nr-' + Math.floor(Math.random() * 99999)
			codeTagHolder[newHolder] = match
			content = content.replace(match, newHolder)
		})
	}

	return content
}

function unMaskCodeTag(content) {
	if(codeTagHolder != null)  {
		for (const [key, value] of Object.entries(codeTagHolder)) {
		  content = content.replace(key, value)
		}
	}

	return content
}

function renderTag(type, text) {
	const fileName = getCompleteFileName(text, type)
	const content = readFile(fileName)
	return content
}

function renderSimpleSection(content, text) {
	const attachName = getTagContent(text.split(',')[0])
	
	const patternBetweenSection = /(?<=@section\()(.*),(.*)(?=\))/g
	const matchSection = content.match(patternBetweenSection).filter(
							item => item.startsWith(attachName) 
						)[0]
	
	//Since attach can include both simple & not simple Section
		//we need to make an exception
	if(matchSection == undefined)
		return text
	
	const value = removeKeyName(matchSection)
	return value
}

function renderLayout(content, text) {
	const attachName = getTagContent(text) 
	const patternBetweenSection = /(?<=@section)([\S\s]*?)(?=@endsection)/g

	let matchSection
	if (content.match(patternBetweenSection)) {
		matchSection = content.match(patternBetweenSection).filter(
						item => item.startsWith("(" + attachName) 
					)[0]	
	}

	if(matchSection == undefined) {

		if(attachName.includes(",")) {
			//attach has default value
			return removeKeyName(attachName)
		}
		return text;
	}

	const sectionContent = matchSection.replace(`(${attachName})`,'').trim()
	return sectionContent
}

function renderComponent(content, rawComp) {
	const compName = rawComp.split(")")[0].replace('@component(', '')
	let compContent = maskCodeTag(renderTag('component', compName))
	compContent = compContent.replace(patterns.attach, renderSlot.bind(this, rawComp))
	
	return compContent
}

function renderSlot(rawComp, rawAttach) {
	const attachName = getTagContent(rawAttach) 

	const patternBetweenSlot = /(?<=@slot)([\S\s]*?)(?=@endslot)/g
	const slots = rawComp.match(patternBetweenSlot)

	let matchSlot = ''
	
	if(slots == null) { //If No slots mean simple component
		matchSlot = rawComp.split(')').slice(1).toString()
							.replace('@endcomponent', '')
	} else {
		matchSlot = slots.filter(
							item => item.startsWith("(" + attachName) 
						)[0]
	}
	
	let slotContent
	if (matchSlot) {
		slotContent = matchSlot.replace(`(${attachName})`,'').trim()
	} else {
		slotContent = ''
	}

	return slotContent
}

function readFileRaw(filename) {
	return fs.readFileSync(filename).toString()
}

function readFile(filename) {
	// return maskCodeTag(fs.readFileSync(filename).toString())
	if (fs.existsSync(filename)) {
		return maskCodeTag(fs.readFileSync(filename).toString())
	} else {
		console.log(`${filename} not found`)
	}
}

function getCompleteFileName(text, type) {
	let filename = ''
	switch(type) {	
		case 'import':
			filename = getTagContent(text)
			return `${dir.import}/${filename}.html`
		break
		case 'layout':
			filename = getTagContent(text)
			return `${dir.layout}/${filename}.html`
		break
		case 'component':
			filename = text
			return `${dir.component}/${filename}.html`
		break
		default:
			console.log('No type file matched.')
		break;
	}
}

function getTagContent(tag){
	return tag.split("(")[1].replace(")","")
}

function createFolderIfNone(dirName) {
	if (!fs.existsSync(dirName))
	    fs.mkdirSync(dirName);
	
	return
}

function removeKeyName(text) {
	const arrayOfText = text.split(",")
	arrayOfText.shift()
	return arrayOfText.toString().trim()
}

} //end runSSG
runSSG() //autoRun 1st time

//=================================
//==== LIVE RELOAD AND WATCH  =====
//=================================
const isWatching = process.argv.includes('--watch');
if(isWatching) {
	const liveServer = require("live-server");
	const chokidar = require('chokidar');

	var params = {
		watch: "./public",
		root: "./public",
		file: "index.html",
		logLevel: 0,
		noCssInject: false
	};
	liveServer.start(params);
	
	chokidar.watch('./dev', {
		ignored: './dev/static/windi.css',
		awaitWriteFinish: {
    	stabilityThreshold: 500
    }
	}).on('all', (event, path) => {
	  runSSG()
	});
}