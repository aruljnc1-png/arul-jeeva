document.addEventListener("DOMContentLoaded", () => {

  const uploadBtn = document.getElementById("uploadBtn");
  const fileInput = document.getElementById("fileInput");
  const gallery = document.getElementById("gallery");
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightboxImg");

  uploadBtn.addEventListener("click", () => {
    fileInput.click();
  });

  fileInput.addEventListener("change", () => {
    Array.from(fileInput.files).forEach(file => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = document.createElement("img");
        img.src = e.target.result;
        img.onclick = () => {
          lightbox.style.display = "flex";
          lightboxImg.src = img.src;
        };
        gallery.appendChild(img);
      };
      reader.readAsDataURL(file);
    });

    fileInput.value = "";
  });

  lightbox.addEventListener("click", () => {
    lightbox.style.display = "none";
  });

});
