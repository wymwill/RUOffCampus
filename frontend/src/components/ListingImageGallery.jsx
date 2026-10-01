import { useCallback, useEffect, useState } from "react";
import { DEFAULT_LISTING_IMAGE } from "../utils/listingUtils";

const MAX_SIDE_TILES = 4;

// Grid placement for the photos beside the main one, by how many there are.
// The main photo always spans two columns and both rows of a four column grid.
const SIDE_TILE_SPANS = {
  1: ["col-span-2 row-span-2"],
  2: ["col-span-2", "col-span-2"],
  3: ["col-span-2", "", ""],
  4: ["", "", "", ""],
};

/**
 * Photo grid like a real estate listing: one large photo with up to four
 * smaller ones beside it, and a "See all photos" button that opens a full
 * screen viewer. Phones show only the large photo.
 */
function ListingImageGallery({ images, title, className = "" }) {
  const galleryImages =
    Array.isArray(images) && images.length > 0
      ? images
      : [
          {
            id: "listing-preview-placeholder",
            name: "Listing preview",
            url: DEFAULT_LISTING_IMAGE,
          },
        ];
  const [viewerIndex, setViewerIndex] = useState(null);
  const [mainImage, ...rest] = galleryImages;
  const sideImages = rest.slice(0, MAX_SIDE_TILES);
  const spans = SIDE_TILE_SPANS[sideImages.length] ?? [];
  const total = galleryImages.length;

  const seeAllButton = total > 1 && (
    <button
      type="button"
      onClick={() => setViewerIndex(0)}
      className="absolute bottom-3 right-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50"
    >
      <span aria-hidden="true" className="grid grid-cols-2 gap-0.5">
        <span className="h-1.5 w-1.5 bg-slate-900" />
        <span className="h-1.5 w-1.5 bg-slate-900" />
        <span className="h-1.5 w-1.5 bg-slate-900" />
        <span className="h-1.5 w-1.5 bg-slate-900" />
      </span>
      See all {total} photos
    </button>
  );

  return (
    <div className={className}>
      {/* The button sits at the grid's bottom right, which is the last photo. */}
      <div className="relative">
        <div
          className={`grid h-64 gap-2 overflow-hidden rounded-2xl sm:h-80 lg:h-[400px] ${
            sideImages.length > 0 ? "md:grid-cols-4 md:grid-rows-2" : ""
          }`}
        >
          <button
            type="button"
            onClick={() => setViewerIndex(0)}
            className={`relative h-full w-full overflow-hidden bg-slate-100 ${
              sideImages.length > 0 ? "md:col-span-2 md:row-span-2" : ""
            }`}
          >
            <img
              src={mainImage.url}
              alt={title}
              className="h-full w-full object-cover transition hover:brightness-95"
            />
          </button>

          {sideImages.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setViewerIndex(index + 1)}
              className={`relative hidden h-full w-full overflow-hidden bg-slate-100 md:block ${spans[index]}`}
            >
              <img
                src={image.url}
                alt={image.name || `${title} photo ${index + 2}`}
                className="h-full w-full object-cover transition hover:brightness-95"
              />
            </button>
          ))}
        </div>
        {seeAllButton}
      </div>

      {viewerIndex != null && (
        <PhotoViewer
          images={galleryImages}
          index={viewerIndex}
          title={title}
          onChange={setViewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </div>
  );
}

function PhotoViewer({ images, index, title, onChange, onClose }) {
  const total = images.length;
  const show = useCallback((nextIndex) => onChange((nextIndex + total) % total), [onChange, total]);

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") show(index + 1);
      if (event.key === "ArrowLeft") show(index - 1);
    };
    window.addEventListener("keydown", handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [index, onClose, show]);

  const image = images[index];
  const navButton =
    "absolute top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-2xl text-slate-900 shadow transition hover:bg-white";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${title} photos`}
      className="fixed inset-0 z-[2000] flex flex-col bg-black/90"
      onClick={onClose}
    >
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="text-sm">
          {index + 1} / {total}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full px-3 py-1 text-sm font-medium hover:bg-white/10"
        >
          Close
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-6">
        <img
          src={image.url}
          alt={image.name || title}
          onClick={(event) => event.stopPropagation()}
          className="max-h-full max-w-full rounded-lg object-contain"
        />
        {total > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous photo"
              onClick={(event) => {
                event.stopPropagation();
                show(index - 1);
              }}
              className={`${navButton} left-4`}
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Next photo"
              onClick={(event) => {
                event.stopPropagation();
                show(index + 1);
              }}
              className={`${navButton} right-4`}
            >
              ›
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default ListingImageGallery;
