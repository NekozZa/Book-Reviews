import express from 'express';
import bodyParser from 'body-parser';
import pg from 'pg';

const app = express();
const port = 3000;

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "books",
    password: process.env.PG_PASSWORD,
    port: 5432,
})

db.connect();

app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static('public'));
app.use(express.json());


app.get('/', async (req, res) => {
    try {
        const books = await getBooks();
        const filters = ['Author', 'Score']
        res.render('index.ejs', {key: 'isbn', size: 'M', books: books, filters: filters});
    } catch (err) {
        console.error(err);
    }
})

app.get('/new', (req, res) => {
    res.render('new.ejs');
})

app.post('/add', async (req, res) => {
    const book_code = req.body.book_code;
    const title = req.body.title;
    const author = req.body.author;
    const review = req.body.review;
    const score = req.body.score;

    await db.query('INSERT INTO books (book_code, title) VALUES ($1, $2)', [book_code, title]);
    await db.query('INSERT INTO book_reviews (book_code, review, score, author) VALUES ($1, $2, $3, $4)', [book_code, review, score, author]);

    res.redirect('/');
})

app.post('/filter', async (req, res) => {
    const filter = req.body.filter;
    const value = req.body.value;

    try {
        const books = await getBooksByFilter(filter, value);
        const filters = ['Author', 'Score']
        res.render('index.ejs', {key: 'isbn', size: 'M', books: books, filters: filters});
    } catch (err) {
        console.error(err);
    }
})

app.post('/delete', async (req, res) => {
    try {
        const bookCodes = req.body.bookCodes;

        for (const bookCode of bookCodes) {
            await db.query('DELETE FROM book_reviews WHERE book_code = $1', [bookCode]);
            await db.query('DELETE FROM books WHERE book_code = $1', [bookCode]);
        }

        res.redirect('/')
    } catch (err) {
        console.error(err);
    }
})

app.post('/edit', async (req, res) => {
    try {
        const book = await getBooksByFilter('books.book_code', req.body.bookCodes[0]);
        res.render('update.ejs', { book: book[0] });
    } catch (err) {
        console.error(err);
    }
})

app.post('/update', async (req, res) => {
    const bookCode = req.body.book_code;
    const author = req.body.author;
    const title = req.body.title;
    const review = req.body.review;
    const score = req.body.score;

    await db.query('UPDATE books SET title = $1 WHERE book_code = $2', [title, bookCode]);
    await db.query('UPDATE book_reviews SET review = $1, score = $2, author = $3 WHERE book_code = $4;', [review, score, author, bookCode]);

    res.redirect('/')
})

app.listen(port, () => {
    console.log('http://localhost:3000/')
})

async function getBooks () {
    var books = []

    const result = await db.query('SELECT title, books.book_code, review, author, score FROM books JOIN book_reviews ON books.book_code = book_reviews.book_code');
    result.rows.forEach((book) => {
        books.push(book);
    })

    return books;
}

async function getBooksByFilter (filter, value) {
    var books = []

    const result = await db.query(
        `SELECT title, books.book_code, review, author, score FROM books JOIN book_reviews ON books.book_code = book_reviews.book_code WHERE ${filter.toLowerCase()} = $1`,
        [value]
    );

    result.rows.forEach((book) => {
        books.push(book);
    })

    return books;
}

