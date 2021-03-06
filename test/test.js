var assert = require('assert'),
	express = require('express'),
	Paperpress = require('../paperpress').Paperpress,
	request = require('supertest'),
	swig = require('swig'),
	_ = require('underscore');


/****************************************/
/**************** SET UP ****************/
/****************************************/
var server = express();
var agent = request.agent(server);

server.engine('html', swig.renderFile);
server.set('view engine', 'html');
server.set('views', __dirname + '/views');
server.set('view cache', false);

swig.setDefaults({ cache: false });

var paperpress = new Paperpress({
	directory : 'test/static',
	themePath : '/test/static/themes/test',
	basePath  : '/blog',
	pagesPath : '/pages',
	articlesPerPage : 2,
	hooks : {
		readArticles : [function(articles){
			articles.forEach(function(article){
				article.bootConfigHook = true;
			});
		}],
		readPages : [function(pages){
			pages.forEach(function(page){
				page.bootConfigHook = true;
			});
		}]
	}
});

paperpress.hooks('readArticles', function(articles){
	articles.forEach(function(article){
		article.extraHook = true;
	});
});

paperpress.attach(server);

server.get('/page-in-express-with-snippet', function(req, res){
	res.render('page-with-snippets');
});


/****************************************/
/**************** TESTS *****************/
/****************************************/
describe('Paperpress', function(){
	describe('Init paperpress', function(){
		it('Paperpress shoud be a function', function(){
			assert.equal(typeof Paperpress, 'function');
		});

		it('paperpress shoud be an object with articles, pages and other config elements', function(){
			assert.equal(typeof paperpress, 'object');
			assert.equal(typeof paperpress.blogDescription , 'object');

			assert.equal(_.isArray(paperpress.articles) , true);
			assert.equal(_.isArray(paperpress.pages) , true);

			assert.equal(paperpress.basePath, '/blog');
			assert.equal(paperpress.pagesPath, '/pages');
			assert.equal(paperpress.directory, 'test/static');

			assert.equal(paperpress.articlesPerPage, 2);
		});

		it('paperpress should have the next set of private function', function () {
			assert.equal(typeof paperpress._titleToSlug, 'function');
			assert.equal(typeof paperpress._sortArticles, 'function');
			assert.equal(typeof paperpress._directoryToPage, 'function');
			assert.equal(typeof paperpress._directoryToArticle, 'function');
			assert.equal(typeof paperpress._readdirexistsSync, 'function');
		});

		it('paperpress should have the next set of public function', function () {
			assert.equal(typeof paperpress.attach, 'function');
			assert.equal(typeof paperpress.getArticlesInPage, 'function');
			assert.equal(typeof paperpress.readArticles, 'function');
			assert.equal(typeof paperpress.readPages, 'function');
		});
	});

	describe('#paperpress.hooks()', function(){
		it('paperpress should add hook', function(){
			assert.equal( paperpress._hooks.fakeHook  , undefined );

			paperpress.hooks('fakeHook', function(){});

			assert.equal( _.isArray( paperpress._hooks.fakeHook ) , true );
			assert.equal( paperpress._hooks.fakeHook.length , 1 );
		});
	});
});

describe('Paperpress Blog Description', function(){
	describe('#paperpress.blogDescription', function(){
		it('paperpress blog description should have this attributes', function(){
			assert.deepEqual(paperpress.blogDescription , {
				'title'       : 'Test Data',
				'description' : 'This is my personnal feed!',
				'link'        : 'http://paperpress.me',
				'copyright'   : 'Copyright © 2013 Siedrix. Beerware',
				'author': {
					'name' : 'Daniel Zavala',
					'email': 'siedrix@gmail.com',
					'link' : 'https://paperpress.me/'
				}
			});
		});
	});
});

describe('Paperpress Read Pages', function(){
	describe('#paperpress.readPages()', function(){
		it('paperpress should have pages', function () {
			assert.equal(paperpress.pages.length, 1);
		});
	});

	describe('#paperpress.readPages hooks', function(){
		it('paperpress articles should have bootConfigHooks', function () {
			var firstPage = paperpress.pages[0];
			assert.equal(firstPage.bootConfigHook, true);
		});
	});
});

describe('Paperpress Read Articles', function(){
	describe('#paperpress.readArticles()', function(){
		it('paperpress should have articles', function () {
			assert.equal(paperpress.articles.length, 7);
		});
	});

	describe('#paperpress.readArticles hooks', function(){
		it('paperpress articles should have bootConfigHooks', function () {
			var firstArticle = paperpress.articles[0];
			assert.equal(firstArticle.bootConfigHook, true);

			var secondArticle = paperpress.articles[1];
			assert.equal(secondArticle.bootConfigHook, true);
		});
		
		it('paperpress articles should have extraHooks', function () {
			var firstArticle = paperpress.articles[0];
			assert.equal(firstArticle.extraHook, true);

			var secondArticle = paperpress.articles[1];
			assert.equal(secondArticle.extraHook, true);
		});
	});
});

describe('Paperpress build context', function(){
	describe('#paperpress.buildContext()', function(){
		it('Should return general context', function () {
			var context = paperpress.buildContext();

			assert.equal(typeof context, 'object');
			assert.equal(typeof context.snippets, 'object');
			assert.equal(typeof context.snippets.header, 'string');
			assert.equal(typeof context.currentPage, 'number');
			assert.equal(context.currentPage, 0);
		});
		it('Should return context with `currentPage` param', function () {
			var context = paperpress.buildContext({ currentPage: 10 });

			assert.equal(context.currentPage, 10);
		});
		it('context first page should have `nextUrl` and should not have `prevUrl`', function () {
			var context = paperpress.buildContext({ currentPage: 0 });

			assert.equal(typeof context.nextUrl, 'string');
			assert.equal(context.nextUrl, paperpress.basePath + '/' + (context.currentPage + 1));
			assert.equal(typeof context.prevUrl, 'undefined');
		});
		it('context second page should have `prevUrl` and should have `nextUrl`', function () {
			var context = paperpress.buildContext({ currentPage: 1 });

			assert.equal(typeof context.nextUrl, 'string');
			assert.equal(context.nextUrl, paperpress.basePath + '/' + (context.currentPage + 1));
			assert.equal(typeof context.prevUrl, 'string');
			assert.equal(context.prevUrl, paperpress.basePath + '/' + (context.currentPage - 1));
		});
		it('context last page should have `prevUrl` and should not have `nextUrl`', function () {
			var context = paperpress.buildContext({
				currentPage: Math.ceil(paperpress.articles.length / paperpress.articlesPerPage)
			});

			assert.equal(typeof context.nextUrl, 'undefined');
			assert.equal(typeof context.prevUrl, 'string');
			assert.equal(context.prevUrl, paperpress.basePath + '/' + (context.currentPage - 1));
		});
	});
});

describe('Paperpress Snippets', function(){
	describe('#paperpress.readSnippets()', function(){
		it('paperpress should have snippets', function () {
			assert.equal( Object.keys(paperpress.snippets).length , 1);
		});

		it('get snippets by name', function () {
			assert.equal(paperpress.getSnippets('header'), '<h2 id="this-is-the-header">This is the header</h2>\n');
		});

		it('getting page with snippet', function(done){
			agent
				.get('/page-in-express-with-snippet')
				.expect(200, 'Snippet: <h2 id="this-is-the-header">This is the header</h2>\n')
				.end(function(err){
					if (err){
						console.log(err);
						return done(err);
					}

					done();
				});
		});
	});
});

describe('Paperpress Reload', function(){
	before(function () {
		paperpress.directory = 'test/reload';
		paperpress.themePath = '/test/reload/themes/reload/layouts';
	});

	describe('#paperpress.readArticles()', function(){
		it('paperpress should have new articles', function () {
			paperpress.readArticles();
			assert.equal(paperpress.articles.length, 8);
		});
	});

	describe('#paperpress.readPages()', function(){
		it('paperpress should have new pages', function () {
			paperpress.readPages();

			assert.equal(paperpress.pages.length, 2);
		});
	});


	describe('#paperpress.readSnippets()', function(){
		it('paperpress should have new snippets', function () {
			paperpress.directory = 'test/reload';
			paperpress.readSnippets();

			assert.equal( Object.keys(paperpress.snippets).length , 2);
			assert.equal( typeof paperpress.snippets.header , 'string');
			assert.equal( typeof paperpress.snippets.footer , 'string');
		});
	});

	describe('#paperpress.readThemeFiles()', function(){
		it('paperpress should have new theme files', function () {
			paperpress.readThemeFiles();
			assert.equal( paperpress.pageTpl({'page': { 'title': 'Reloaded'} }) , '<h1>Page: Reloaded</h1>');
			//assert.equal( typeof paperpress.snippets.footer , 'string');
		});
	});
});

describe('Paperpress Request Articles', function(){
	it('#request /blog/five-five', function(done){
		agent
		.get('/blog/five-five')
		.expect(200, 'Five Five\n\n<div><p>Five is awesome</p>\n</div>\n')
		.end(function(err){
			if (err){
				console.log(err);
				return done(err);
			}

			done();
		});
	});

	it('#request /blog/mr-eight', function(done){
		agent
		.get('/blog/mr-eight')
		.expect(200, 'Mr Eight\n\n<div><p>Mr Eight is here</p>\n</div>\n')
		.end(function(err){
			if (err){
				console.log(err);
				return done(err);
			}

			done();
		});
	});
});

describe.skip('Paperpress getArticlesInPage', function(){
	describe('#paperpress.getArticlesInPage() if 2 per page', function(){
		it('getArticlesInPage for page 1', function(){
			assert.equal(true , false);
		});

		it('getArticlesInPage for page 2', function(){
			assert.equal(true , false);
		});

		it('getArticlesInPage for page 3', function(){
			assert.equal(true , false);
		});

		it('getArticlesInPage for page 4', function(){
			assert.equal(true , false);
		});

		it('getArticlesInPage for page 5', function(){
			assert.equal(true , false);
		});
	});

	describe('#paperpress.getArticlesInPage() if 5 per page', function(){
		it('getArticlesInPage for page 1', function(){
			assert.equal(true , false);
		});

		it('getArticlesInPage for page 2', function(){
			assert.equal(true , false);
		});

		it('getArticlesInPage for page 3', function(){
			assert.equal(true , false);
		});
	});
});

