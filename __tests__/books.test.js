process.env.NODE_ENV = "test";

const request = require("supertest");
const app = require("../app");
const db = require("../db");

let book_isbn;

beforeEach(async function () {
  let result = await db.query(`
        INSERT INTO books
        (isbn, amazon_url, author, language, pages, publisher, title, year)
        VALUES
        ('123456789', 'https://www.amazon.com', 'HP Lovecraft', 'English', 99, 'Publishing Company', 'Call of Cthulu', 2025)
        RETURNING isbn`);
  book_isbn = result.rows[0].isbn;
});

describe("GET /books", function () {
  test("Gets a list of all books", async function () {
    const response = await request(app).get(`/books`);
    const books = response.body.books;
    expect(books).toHaveLength(1);
    expect(books[0]).toHaveProperty("title");
  });
});

describe("GET /books/id", function () {
  test("Gets single book based on isbn", async function () {
    const response = await request(app).get(`/books/${book_isbn}`);
    expect(response.body.book).toHaveProperty("author");
    expect(response.body.book.isbn).toBe(book_isbn);
  });
  test("Get a 404 error if ISBN not found", async function () {
    const response = await request(app).get(`/books/69`);
    expect(response.statusCode).toBe(404);
  });
});

describe("POST /books", function () {
  test("Posts book to DB and returns that new book", async function () {
    const response = await request(app).post("/books").send({
      isbn: "987654321",
      amazon_url: "https://www.amazon.com",
      author: "AUSTIN",
      language: "English",
      pages: 201,
      publisher: "Penguin House",
      title: "Book Title",
      year: 2035,
    });
    expect(response.statusCode).toBe(201);
    expect(response.body.book.isbn).toBe("987654321");
    expect(response.body.book).toHaveProperty("isbn");
  });
  test("Stops a book being posted when the input doesnt match the schema", async function () {
    const response = await request(app).post("/books").send({
      //MISSING ISBN LINK
      amazon_url: "https://www.amazon.com",
      author: "AUSTIN",
      language: "English",
      pages: 201,
      publisher: "Penguin House",
      title: "Book Title",
      year: 2035,
    });
    expect(response.statusCode).toBe(400); //400 = bad request
  });
});

describe("PUT /books/:id", function () {
  test("Updates a book and returns in when given valid data", async function () {
    const response = await request(app).put(`/books/${book_isbn}`).send({
      isbn: "123456789",
      amazon_url: "https://www.amazon.com",
      author: "HP Lovecraft",
      language: "English",
      pages: 99,
      publisher: "Publishing Company",
      title: "Book Title HAS CHANGED!! Does This Work?",
      year: 2025,
    });
    expect(response.statusCode).toBe(200);
    expect(response.body.book.title).toBe(
      "Book Title HAS CHANGED!! Does This Work?"
    );
  });
  test("Does NOT update a book when given bad data", async function () {
    const response = await request(app).put(`/books/${book_isbn}`).send({
      isbn: "123456789",
      //MISSING AMAZON LINK! This should NOT work!
      author: "HP Lovecraft",
      language: "English",
      pages: 99,
      publisher: "Publishing Company",
      title: "Book Title HAS CHANGED!! Does This Work?",
      year: 2025,
    });
    expect(response.statusCode).toBe(400);
  });
});

describe("DELETE /books/:id", function () {
  test("Deletes a single a book", async function () {
    const response = await request(app).delete(`/books/${book_isbn}`);
    expect(response.body).toEqual({ message: "Book deleted" });
  });
});

afterEach(async function () {
  await db.query("DELETE FROM BOOKS");
});

afterAll(async function () {
  await db.end(); //This closes the connection, allowing jest to exit properly.
});
