document.addEventListener("DOMContentLoaded", () => {

  const uploadBtn = document.getElementById("uploadBtn");
  const fileInput = document.getElementById("fileInput");
  const gallery = document.getElementById("gallery");
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightboxImg");

  uploadBtn.addEventListener("click", () => {
    fileInput.click();
  });

  fileInput.addEventListener("change", function () {
    const files = this.files;

    for (let i = 0; i < files.length; i++) {
      const reader = new FileReader();

      reader.onload = function (e) {
        const img = document.createElement("img");
        img.src = e.target.result;
        img.onclick = () => openLightbox(img.src);
        gallery.appendChild(img);
      };

      reader.readAsDataURL(files[i]);
    }

    // reset so same photo can be re-selected
    fileInput.value = "";
  });

  function openLightbox(src) {
    lightbox.style.display = "flex";
    lightboxImg.src = src;
  }

  window.closeLightbox = function () {
    lightbox.style.display = "none";
  };

});
