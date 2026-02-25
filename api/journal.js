export default async function handler(req, res) {

  // in-memory storage (temporary, but works immediately)
  global.journal = global.journal || [];

  if (req.method === "GET") {

    const date = req.query.date;

    let entries = global.journal;

    if (date) {
      entries = entries.filter(e =>
        e.createdAt.slice(0,10) === date
      );
    }

    return res.json({
      ok:true,
      entries
    });
  }


  if (req.method === "POST") {

    const { text } = req.body;

    if (!text)
      return res.json({
        ok:false,
        error:"No text"
      });

    const entry = {
      id: Date.now().toString(),
      text,
      createdAt: new Date().toISOString()
    };

    // newest first
    global.journal.unshift(entry);

    return res.json({
      ok:true,
      entry
    });
  }

  res.json({
    ok:false,
    error:"Method not allowed"
  });

}
