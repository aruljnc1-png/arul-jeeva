const cloudName = "dtamlqfx3";
const uploadPreset = "aruljeeva";

const fileInput = document.getElementById("fileInput");
const uploadBtn = document.getElementById("uploadBtn");
const gallery = document.getElementById("gallery");
const albumSelect = document.getElementById("albumSelect");

let albums = {};

uploadBtn.onclick = () => {
  let album = albumSelect.value;

  if (!album) {
    album = prompt("Moment title (e.g. Krabi)");
    if (!album) return;

    addAlbum(album);
    albumSelect.value = album;
  }

  fileInput.click();
};

fileInput.onchange = async () => {
  const album = albumSelect.value;
  const files = [...fileInput.files];

  for (const file of files) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);
    formData.append("folder", album);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: "POST", body: formData }
    );

    const data = await res.json();
    addImage(data.secure_url);
  }

  fileInput.value = "";
};

function addAlbum(name) {
  if (albums[name]) return;
  albums[name] = true;

  const opt = document.createElement("option");
  opt.value = name;
  opt.textContent = name;
  albumSelect.appendChild(opt);
}

function addImage(url) {
  const img = document.createElement("img");
  img.src = url;
  img.onclick = () => openLightbox(url);
  gallery.prepend(img);
}

function openLightbox(url) {
  document.getElementById("lightboxImg").src = url;
  document.getElementById("lightbox").style.display = "flex";
}

function closeLightbox() {
  document.getElementById("lightbox").style.display = "none";
}