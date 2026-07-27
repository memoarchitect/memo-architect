document.addEventListener("DOMContentLoaded", () => {
  const dialog = document.createElement("dialog");
  dialog.className = "memo-image-dialog";
  dialog.innerHTML = '<div class="memo-image-dialog__content"><button type="button" aria-label="Close enlarged image">×</button><img alt=""></div>';
  const image = dialog.querySelector("img");
  const closeButton = dialog.querySelector("button");

  closeButton.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  document.body.append(dialog);

  const open = (thumbnail) => {
      const link = thumbnail.closest("a");
      image.src = link?.classList.contains("memo-zoomable") ? link.href : thumbnail.currentSrc || thumbnail.src;
      image.alt = thumbnail.alt || "Enlarged diagram";
      dialog.showModal();
      closeButton.focus();
  };

  // Every content diagram is inspectable. Existing explicit links keep their
  // source target; ordinary Markdown images use their own full-size asset.
  document.querySelectorAll(".md-content img").forEach((thumbnail) => {
    thumbnail.classList.add("memo-zoomable-image");
    thumbnail.setAttribute("role", "button");
    thumbnail.setAttribute("tabindex", "0");
    thumbnail.setAttribute("aria-label", `Open larger image: ${thumbnail.alt || "diagram"}`);
    thumbnail.addEventListener("click", (event) => {
      event.preventDefault();
      open(thumbnail);
    });
    thumbnail.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open(thumbnail);
      }
    });
  });
});
