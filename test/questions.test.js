// tests/questions.test.js

// Jest timeout'u uzat
jest.setTimeout(30000);

const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
let app, mongoServer;

beforeAll(async () => {
  // 1) In-memory MongoDB başlat
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongoServer.getUri();

  // 2) app’i yeniden import et (env ayarlı haliyle)
  app = require("../server");

  // 3) Mongoose ile bağlantıyı sağla
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
}, 30000);

afterAll(async () => {
  // Mongoose bağlantısını kapat
  await mongoose.disconnect();
  // MongoMemoryServer varsa durdur
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  // Her test öncesi koleksiyonu sil
  const collections = mongoose.connection.collections;
  for (let key in collections) {
    await collections[key].deleteMany({});
  }
});

describe("Questions API", () => {
  it("GET /api/questions → boş liste döner", async () => {
    const res = await request(app).get("/api/questions");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("POST /api/questions → yeni soru oluşturur", async () => {
    const payload = {
      question: "2+2 kaçtır?",
      answers: [
        { text: "3", correct: false },
        { text: "4", correct: true }
      ]
    };
    const res = await request(app)
      .post("/api/questions")
      .send(payload);
    expect(res.statusCode).toBe(201);
    expect(res.body).toMatchObject({ question: payload.question });
    expect(res.body.answers).toHaveLength(2);
  });

  it("POST /api/questions → eksik payload ile 400 döner", async () => {
    const res = await request(app)
      .post("/api/questions")
      .send({ question: "Eksik cevaplar var" });
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message");
  });

  it("PUT /api/questions/:id → var olan soruyu günceller", async () => {
    // önce bir soru ekle
    const { body: created } = await request(app)
      .post("/api/questions")
      .send({
        question: "Eski soru?",
        answers: [{ text: "cevap", correct: true }]
      });

    const res = await request(app)
      .put(`/api/questions/${created._id}`)
      .send({ question: "Güncel soru?" });
    expect(res.statusCode).toBe(200);
    expect(res.body.question).toBe("Güncel soru?");
  });

  it("PUT /api/questions/:id → bulunamayan id ile 404 döner", async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .put(`/api/questions/${fakeId}`)
      .send({ question: "Yok" });
    expect(res.statusCode).toBe(404);
  });

  it("DELETE /api/questions/:id → var olan soruyu siler", async () => {
    const { body: created } = await request(app)
      .post("/api/questions")
      .send({
        question: "Silinecek soru?",
        answers: [{ text: "cevap", correct: false }]
      });

    const res = await request(app).delete(`/api/questions/${created._id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("message", "Soru başarıyla silindi!");
  });

  it("DELETE /api/questions → tüm soruları siler", async () => {
    // önce 2 soru ekle
    await request(app).post("/api/questions").send({
      question: "Q1",
      answers: [{ text: "A", correct: true }]
    });
    await request(app).post("/api/questions").send({
      question: "Q2",
      answers: [{ text: "B", correct: false }]
    });

    const res = await request(app).delete("/api/questions");
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("message", "Tüm sorular başarıyla silindi!");

    // Gerçekten silindi mi?
    const getRes = await request(app).get("/api/questions");
    expect(getRes.body).toEqual([]);
  });
});