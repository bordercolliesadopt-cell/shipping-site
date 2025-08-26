const path = require('path');
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const { loadEnv } = require('./config/env');
// Use PostgreSQL in production (Render), MySQL locally
console.log('Environment check:');
console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);

const usePostgres = !!(process.env.DATABASE_URL || process.env.NODE_ENV === 'production');
console.log('Using PostgreSQL:', usePostgres);

const dbConfig = usePostgres
	? require('./config/db-postgres')
	: require('./config/db');
const { runMigrations, ensureDefaultAdmin, ensureDatabase, getPool } = dbConfig;
const ejsMate = require('ejs-mate');

loadEnv();

const app = express();

app.engine('ejs', ejsMate);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Use default ejs-mate layout resolution; views reference 'layouts/admin'

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/img', express.static(path.join(__dirname, '..', 'img')));

// Load settings from DB on each request so globals (e.g., company name) are dynamic
app.use(async (req, res, next) => {
	try {
		const [rows] = await getPool().query('SELECT key, value FROM settings');
		const settingsMap = {};
		if (rows && Array.isArray(rows)) {
			rows.forEach(r => (settingsMap[r.key] = r.value));
		}
		// Avoid clashing with Express options.settings used by ejs-mate
		res.locals.appSettings = settingsMap;
		res.locals.companyName = settingsMap.COMPANY_NAME || process.env.COMPANY_NAME || 'Emilash Logistics';
	} catch (e) {
		// Fallbacks if DB not reachable yet
		res.locals.appSettings = res.locals.appSettings || {};
		res.locals.companyName = res.locals.companyName || process.env.COMPANY_NAME || 'Emilash Logistics';
	} finally {
		next();
	}
});

app.use(
	session({
		secret: process.env.SESSION_SECRET || 'dev_secret',
		resave: false,
		saveUninitialized: false,
		cookie: { maxAge: 1000 * 60 * 60 * 8 },
	})
);
app.use(flash());

app.use((req, res, next) => {
	res.locals.flashSuccess = req.flash('success');
	res.locals.flashError = req.flash('error');
	res.locals.currentUser = req.session && req.session.adminUser
		? { id: req.session.adminUser.id, name: req.session.adminUser.name, email: req.session.adminUser.email }
		: null;
	// companyName already set by DB settings middleware; fallback only
	res.locals.companyName = res.locals.companyName || process.env.COMPANY_NAME || 'Emilash Logistics';
	next();
});

const adminRouter = require('./routes/admin');
const trackingController = require('./controllers/trackingController');

app.use('/admin', adminRouter);

// Public tracking routes
app.get('/track', trackingController.index);
app.get('/api/track/:trackingNumber', trackingController.getTrackingData);

app.get('/', (req, res) => {
	return res.render('public/home', { title: 'Home' });
});

app.get('/about', (req, res) => {
	return res.render('public/about', { title: 'About' });
});

app.get('/contact', (req, res) => {
	return res.render('public/contact', { title: 'Contact' });
});

app.get('/services', (req, res) => {
	return res.render('public/services', { title: 'Services' });
});

app.get('/testimonials', (req, res) => {
	return res.render('public/testimonials', { title: 'Testimonials' });
});

(async () => {
	try {
		await ensureDatabase();
		await runMigrations();
		await ensureDefaultAdmin();
		const port = process.env.PORT || 3000;
		app.listen(port, () => {
			console.log(`Server running on http://localhost:${port}`);
		});
	} catch (err) {
		console.error('Failed to start server:', err);
		process.exit(1);
	}
})();
