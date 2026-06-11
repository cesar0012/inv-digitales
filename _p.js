const fs = require("fs");
let c = fs.readFileSync("server/index.js", "utf8");
const old = ``const imgPath = join(__dirname, '..', 'img');
app.use('/img' , express.static(imgPath));

const storagePath = join(__dirname, 'storage', 'users');``;
const new = ``const imgPath = join(__dirname, '..', 'img');
app.use('/img' , express.static(imgPath));

app.get('/api/images/:folder/list', (req, res) => {
  const folder = req.params.folder;
  const folderPath = join(imgPath, folder);

  if (!existsSync(folderPath)) {
    return res.json({ images: [] });
  }

  try {
    const files = readdirSync(folderPath)
      .filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f));
    res.json({ images: files });
  } catch (err) {
    console.error('Error listing images:', err);
    res.json({ images: [] });
  }
});

const storagePath = join(__dirname, 'storage', 'users');``;
if(c.includes(old)){c=c.replace(old,new);fs.writeFileSync("server/index.js",c,"utf8");console.log("SUC4SS2"—ÖVÇ6W¶6öç6öÆRæÆör‚$äõBdõTäB"—