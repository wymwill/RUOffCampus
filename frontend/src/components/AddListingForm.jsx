import { useEffect, useMemo, useState } from "react";
import CardDescription from "./CardDescription";
import ListingImageGallery from "./ListingImageGallery";
import Sidebar from "./Sidebar";
import { createListing, getListingsAccessToken, updateListing } from "../api/listingsApi";
import { useAuth } from "../context/AuthContext";
import { MAX_LISTING_IMAGES, filesToListingImages } from "../utils/imageUtils";
import { geocodeAddressToNearestCampus } from "../utils/locationUtils";
import { normalizeListing } from "../utils/listingUtils";
import { addOwnedListingId } from "../utils/listingOwnershipCache";
import { prefillOwnSublet } from "../utils/prefillOwnSublet";
import { listingToFormData } from "../utils/listingForm";

const defaultFormState = {
  title: "",
  address: "",
  price: "",
  beds: "",
  baths: "",
  propertyType: "apartment",
  available_from: "",
  available_to: "",
  landlordNum: "",
  landlordEmail: "",
  description: "",
  images: [],
  amenities: {
    Parking: false,
    Laundry: false,
    Pet_Friendly: false,
    Furnished: false,
  },
};

const defaultLocationState = {
  status: "idle",
  requestAddress: "",
  campus: "",
  distance: null,
  latitude: null,
  longitude: null,
  message: "",
};

/**
 * Full listing composer: form, live preview, and POST to /listings on submit.
 * On success calls onCreated with a normalized listing (includes server id when returned).
 * Pass initialListing to edit an existing listing instead. Saving then PUTs to
 * /listings/:id and calls onSaved with the updated listing.
 */
export default function AddListingForm({ onCreated, initialListing = null, onSaved }) {
  const { session } = useAuth();
  const isEditing = Boolean(initialListing);
  const [existingPost, setExistingPost] = useState("");
  const [prefillNotice, setPrefillNotice] = useState("");
  const [formData, setFormData] = useState(() =>
    initialListing
      ? listingToFormData(initialListing)
      : {
          ...defaultFormState,
          amenities: { ...defaultFormState.amenities },
        }
  );
  const [locationState, setLocationState] = useState(() =>
    buildInitialLocationState(initialListing)
  );
  // Keep the saved location for the saved address instead of geocoding it again.
  const initialAddress = locationState.status === "resolved" ? locationState.requestAddress : "";
  const originalAvailableFrom = initialListing?.available_from?.slice(0, 10) || "";
  const [imageError, setImageError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isDraggingImages, setIsDraggingImages] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const today = getTodayDateString();

  useEffect(() => {
    const trimmedAddress = formData.address.trim();

    if (!trimmedAddress || trimmedAddress.length < 8) {
      return;
    }

    if (initialAddress && trimmedAddress === initialAddress) {
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      setLocationState((prev) => ({
        ...prev,
        status: "loading",
        requestAddress: trimmedAddress,
        message: "Finding the nearest Rutgers campus...",
      }));

      resolveAddressState(trimmedAddress, controller.signal)
        .then((nextLocationState) => {
          setLocationState(nextLocationState);
        })
        .catch((error) => {
          if (error.name !== "AbortError") {
            setLocationState(buildLocationErrorState(trimmedAddress));
          }
        });
    }, 700);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [formData.address, initialAddress]);

  const previewListing = useMemo(
    () =>
      normalizeListing({
        ...formData,
        price: Number(formData.price || 0),
        beds: Number(formData.beds || 0),
        baths: Number(formData.baths || 0),
        distance: locationState.distance ?? 0,
        campus: locationState.campus,
        nearestStudentCenter: locationState.studentCenter,
        latitude: locationState.latitude,
        longitude: locationState.longitude,
      }),
    [formData, locationState]
  );

  const dateErrors = useMemo(
    () =>
      validateAvailabilityDates(
        formData.available_from,
        formData.available_to,
        today,
        originalAvailableFrom
      ),
    [formData.available_from, formData.available_to, today, originalAvailableFrom]
  );

  const minimumAvailableToDate = formData.available_from
    ? getNextDateString(formData.available_from)
    : today;

  const handlePrefill = () => {
    const draft = prefillOwnSublet(existingPost);
    if (!draft.description) return;
    setFormData((previous) => ({
      ...previous,
      title: previous.title || draft.title,
      description: previous.description || draft.description,
      price: previous.price || draft.price,
    }));
    setPrefillNotice("Draft added. Check every field, add your address and dates, then publish when ready.");
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (name === "address") {
      const trimmedAddress = value.trim();

      if (!trimmedAddress) {
        setLocationState(defaultLocationState);
      } else if (initialAddress && trimmedAddress === initialAddress) {
        setLocationState(buildInitialLocationState(initialListing));
      } else if (trimmedAddress.length < 8) {
        setLocationState({
          status: "typing",
          requestAddress: trimmedAddress,
          campus: "",
          distance: null,
          latitude: null,
          longitude: null,
          message: "Enter a full street address so we can estimate the nearest campus.",
        });
      } else {
        setLocationState((prev) => ({
          ...prev,
          status: "pending",
          requestAddress: trimmedAddress,
          message: "Address updated. Estimating the nearest campus...",
        }));
      }
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAmenityChange = (event) => {
    const { name, checked } = event.target;

    setFormData((prev) => ({
      ...prev,
      amenities: {
        ...prev.amenities,
        [name]: checked,
      },
    }));
  };

  const appendImages = async (fileList) => {
    if (!fileList || fileList.length === 0) return;

    const remainingSlots = MAX_LISTING_IMAGES - formData.images.length;
    if (remainingSlots <= 0) {
      setImageError(`You can add up to ${MAX_LISTING_IMAGES} images.`);
      return;
    }

    setImageError("");

    try {
      const imageEntries = await filesToListingImages(fileList, remainingSlots);

      if (imageEntries.length === 0) {
        setImageError("Only image files can be dropped here.");
        return;
      }

      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...imageEntries],
      }));
    } catch (error) {
      setImageError(error.message || "Could not load the dropped images.");
    }
  };

  const handleFileSelection = async (event) => {
    await appendImages(event.target.files);
    event.target.value = "";
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    setIsDraggingImages(false);
    await appendImages(event.dataTransfer.files);
  };

  const removeImage = (imageId) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((image) => image.id !== imageId),
    }));
  };

  const ensureResolvedLocation = async () => {
    const trimmedAddress = formData.address.trim();
    if (!trimmedAddress) return null;

    if (
      locationState.status === "resolved" &&
      locationState.requestAddress === trimmedAddress
    ) {
      return locationState;
    }

    setLocationState((prev) => ({
      ...prev,
      status: "loading",
      requestAddress: trimmedAddress,
      message: "Finding the nearest Rutgers campus...",
    }));

    try {
      const nextLocationState = await resolveAddressState(trimmedAddress);
      setLocationState(nextLocationState);

      return nextLocationState.status === "resolved" ? nextLocationState : null;
    } catch (error) {
      if (error.name !== "AbortError") {
        setLocationState(buildLocationErrorState(trimmedAddress));
      }

      return null;
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError("");
    setIsSubmitting(true);

    if (dateErrors.available_from || dateErrors.available_to) {
      setIsSubmitting(false);
      return;
    }

    if (!session?.user?.id) {
      setSubmitError(`Sign in required to ${isEditing ? "edit" : "create"} a listing.`);
      setIsSubmitting(false);
      return;
    }

    const resolvedLocation = await ensureResolvedLocation();
    if (!resolvedLocation) {
      setIsSubmitting(false);
      return;
    }

    const contactLines = [];
    if (formData.landlordNum.trim()) {
      contactLines.push(`Phone: ${formData.landlordNum.trim()}`);
    }
    if (formData.landlordEmail.trim()) {
      contactLines.push(`Email: ${formData.landlordEmail.trim()}`);
    }
    const descriptionBase = formData.description.trim();
    const descriptionForApi =
      contactLines.length > 0
        ? `${descriptionBase}${descriptionBase ? "\n\n" : ""}— Contact —\n${contactLines.join("\n")}`
        : descriptionBase;

    const priceMonthly = Number(formData.price);
    const coverUrl = formData.images[0]?.url?.trim() || null;

    // Prefer the live session token; fallback to localStorage for backwards compatibility.
    const accessToken =
      session?.access_token ?? getListingsAccessToken();

    const payload = {
      title: formData.title.trim(),
      description: descriptionForApi || null,
      address: formData.address.trim(),
      price_monthly: priceMonthly,
      price_label: `$${priceMonthly}`,
      campus_location: resolvedLocation.campus,
      beds: Number(formData.beds),
      baths: Number(formData.baths),
      property_type: formData.propertyType,
      distance: resolvedLocation.distance,
      image_url: coverUrl,
      images: formData.images,
      amenities: formData.amenities,
      available_from: formData.available_from,
      available_to: formData.available_to,
      landlord_phone: formData.landlordNum.trim(),
      landlord_email: formData.landlordEmail.trim(),
      latitude: resolvedLocation.latitude,
      longitude: resolvedLocation.longitude,
    };

    if (isEditing) {
      try {
        const updated = await updateListing(initialListing.id, payload, { accessToken });
        onSaved?.(normalizeListing(updated));
      } catch (err) {
        setSubmitError(err.message || "Could not save changes.");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    try {
      const created = await createListing(payload, {
        accessToken,
      });

      const merged = normalizeListing({
        ...formData,
        title: formData.title.trim(),
        address: formData.address.trim(),
        id: created.id,
        price: created.price ?? priceMonthly,
        beds: created.beds ?? Number(formData.beds),
        campus: created.campus_location ?? resolvedLocation.campus,
        distance: created.distance ?? resolvedLocation.distance,
        description: formData.description.trim(),
        landlordNum: formData.landlordNum.trim(),
        landlordEmail: formData.landlordEmail.trim(),
        image: created.image_url || coverUrl,
        images: formData.images,
        created_at: created.created_at,
        host_id: created.host_id ?? session.user.id,
      });

      addOwnedListingId(session.user.id, created.id);
      onCreated?.(merged);
    } catch (err) {
      const msg =
        err.status === 401
          ? `Sign in required. ${err.message || "Authorization failed."}`
          : err.message || "Could not save listing.";
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid gap-8 2xl:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)]">
      <form onSubmit={handleSubmit} className="space-y-8">
        {!isEditing && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-scarlet">Already wrote your sublet post?</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">Start with your own post</h2>
          <p className="mt-2 text-sm text-slate-600">
            Paste a post you wrote. We'll fill a draft, not publish it. Only your Rutgers account can post
            your listing here. Check the address, rent, dates and contact details before publishing.
          </p>
          <textarea
            value={existingPost}
            onChange={(event) => setExistingPost(event.target.value)}
            rows={4}
            maxLength={4000}
            aria-label="Paste your own sublet post"
            placeholder="Paste the post you wrote for a housing group"
            className="mt-4 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none ring-red-200 focus:ring"
          />
          <button
            type="button"
            onClick={handlePrefill}
            disabled={!existingPost.trim()}
            className="mt-3 rounded-full border border-slate-300 px-5 py-2 text-sm font-medium text-slate-800 hover:border-red-500 disabled:opacity-50"
          >
            Use as draft
          </button>
          {prefillNotice && <p role="status" className="mt-3 text-sm text-slate-700">{prefillNotice}</p>}
        </section>
        )}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-scarlet">Photo Gallery</p>
              <h2 className="text-2xl font-semibold text-slate-900">
                Upload the images users will see first
              </h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
              {formData.images.length}/{MAX_LISTING_IMAGES} images
            </span>
          </div>

          <ListingImageGallery
            images={previewListing.images}
            title={previewListing.title}
          />

          <div
            onDragOver={(event) => {
              event.preventDefault();
              setIsDraggingImages(true);
            }}
            onDragLeave={() => setIsDraggingImages(false)}
            onDrop={handleDrop}
            className={`mt-6 rounded-2xl border-2 border-dashed p-6 text-center transition ${
              isDraggingImages
                ? "border-red-500 bg-red-50"
                : "border-slate-300 bg-slate-50"
            }`}
          >
            <p className="text-lg font-medium text-slate-900">
              Drag images here or browse from your computer
            </p>
            <p className="mt-2 text-sm text-slate-600">
              The first image becomes the cover image on the listing card.
            </p>

            <label className="mt-4 inline-flex cursor-pointer rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-700">
              Select Images
              <input
                hidden
                multiple
                accept="image/*"
                type="file"
                onChange={handleFileSelection}
              />
            </label>

            {imageError && (
              <p className="mt-3 text-sm text-red-600">{imageError}</p>
            )}
          </div>

          {formData.images.length > 0 && (
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {formData.images.map((image, index) => (
                <div
                  key={image.id}
                  className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-3"
                >
                  <img
                    src={image.url}
                    alt={image.name}
                    className="h-16 w-16 rounded-2xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">
                      {image.name}
                    </p>
                    <p className="text-sm text-slate-500">
                      {index === 0 ? "Cover image" : `Gallery image ${index + 1}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeImage(image.id)}
                    className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="grid gap-8 xl:grid-cols-[2fr_1fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-8 border-b border-slate-200 pb-8">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Listing title
                </span>
                <input
                  required
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-2xl font-semibold text-slate-900 outline-none ring-red-200 focus:ring"
                  placeholder="Spacious 2BR close to Rutgers buses"
                />
              </label>

              <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(220px,0.7fr)]">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Street address
                  </span>
                  <input
                    required
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-lg text-slate-900 outline-none ring-red-200 focus:ring"
                    placeholder="29 Easton Avenue, New Brunswick, NJ"
                  />
                  <p
                    className={`mt-2 text-sm ${getLocationMessageClass(
                      locationState.status
                    )}`}
                  >
                    {getLocationMessage(locationState)}
                  </p>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Property type
                  </span>
                  <select
                    name="propertyType"
                    value={formData.propertyType}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-lg text-slate-900 outline-none ring-red-200 focus:ring"
                  >
                    <option value="apartment">Apartment</option>
                    <option value="house">House</option>
                    <option value="studio">Studio</option>
                    <option value="townhome">Townhome</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="mb-8 grid gap-6 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Bedrooms
                </span>
                <input
                  required
                  min="0"
                  type="number"
                  name="beds"
                  value={formData.beds}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-lg text-slate-900 outline-none ring-red-200 focus:ring"
                  placeholder="2"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Bathrooms
                </span>
                <input
                  required
                  min="0"
                  step="0.5"
                  type="number"
                  name="baths"
                  value={formData.baths}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-lg text-slate-900 outline-none ring-red-200 focus:ring"
                  placeholder="1"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Available from
                </span>
                <input
                  required
                  type="date"
                  name="available_from"
                  value={formData.available_from}
                  onChange={handleChange}
                  min={originalAvailableFrom && originalAvailableFrom < today ? originalAvailableFrom : today}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-lg text-slate-900 outline-none ring-red-200 focus:ring"
                />
                {dateErrors.available_from && (
                  <p className="mt-2 text-sm text-red-600">
                    {dateErrors.available_from}
                  </p>
                )}
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Available to
                </span>
                <input
                  required
                  type="date"
                  name="available_to"
                  value={formData.available_to}
                  onChange={handleChange}
                  min={minimumAvailableToDate}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-lg text-slate-900 outline-none ring-red-200 focus:ring"
                />
                {dateErrors.available_to && (
                  <p className="mt-2 text-sm text-red-600">
                    {dateErrors.available_to}
                  </p>
                )}
              </label>
            </div>

            <div className="mb-8 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Nearest Campus
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {locationState.campus || "Waiting for address"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Estimated Distance
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {typeof locationState.distance === "number"
                    ? `${locationState.distance} miles`
                    : "Not calculated yet"}
                </p>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="mb-4 text-2xl font-bold text-gray-900">
                About this Property
              </h2>
              <textarea
                rows="6"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-base text-slate-900 outline-none ring-red-200 focus:ring"
                placeholder="Describe the apartment, lease dates, roommates, neighborhood, and anything else renters should know."
              />
            </div>

            <div>
              <h2 className="mb-4 text-2xl font-bold text-gray-900">Amenities</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {Object.entries(formData.amenities).map(([key, checked]) => (
                  <label
                    key={key}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                  >
                    <input
                      type="checkbox"
                      name={key}
                      checked={checked}
                      onChange={handleAmenityChange}
                      className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                    />
                    {key.replaceAll("_", " ")}
                  </label>
                ))}
              </div>
            </div>
          </section>

          <aside className="rounded-2xl bg-surface-low p-6 shadow-sm">
            <h2 className="mb-6 text-3xl font-bold text-[#cc0033]">
              <label className="block">
                <span className="mb-2 block text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
                  Monthly Rent
                </span>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-300 bg-white px-4 py-3">
                  <span className="text-slate-500">$</span>
                  <input
                    required
                    min="0"
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    className="w-full bg-transparent text-2xl font-bold text-[#cc0033] outline-none"
                    placeholder="2400"
                  />
                  <span className="text-base font-medium text-slate-500">/month</span>
                </div>
              </label>
            </h2>

            <div>
              <h2 className="font-bold">Contact the poster</h2>
              <p className="mt-2 text-sm text-slate-600">
                Phone and email are optional. Students can message your Rutgers account in the app.
                Only add contact details you want public.
              </p>
            </div>

            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Phone number
                </span>
                <input
                  type="tel"
                  name="landlordNum"
                  value={formData.landlordNum}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none ring-red-200 focus:ring"
                  placeholder="1-732-555-0199"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Email address
                </span>
                <input
                  type="email"
                  name="landlordEmail"
                  value={formData.landlordEmail}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none ring-red-200 focus:ring"
                  placeholder="owner@example.com"
                />
              </label>
            </div>

            {submitError && (
              <p className="mt-4 text-sm text-red-600" role="alert">
                {submitError}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting || locationState.status === "loading"}
              className="mt-8 w-full rounded-lg bg-[#cc0033] py-3 font-medium text-white transition-colors hover:bg-[#a80029] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting
                ? isEditing
                  ? "Saving changes..."
                  : "Saving listing..."
                : isEditing
                  ? "Save changes"
                  : "Save listing"}
            </button>
          </aside>
        </div>
      </form>

      <aside className="self-start 2xl:sticky 2xl:top-24">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-scarlet">Live Preview</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-900">
            What renters will see
          </h2>

          <div className="mt-6">
            <ListingImageGallery
              images={previewListing.images}
              title={previewListing.title}
            />
          </div>

          <div className="mt-8 grid gap-8 xl:grid-cols-[2fr_1fr]">
            <CardDescription foundListing={previewListing} />
            <Sidebar foundListing={previewListing} />
          </div>
        </div>
      </aside>
    </div>
  );
}

function getLocationMessage(locationState) {
  if (locationState.message) return locationState.message;
  if (locationState.status === "idle")
    return "Enter the property address to calculate distance.";
  return "";
}

function getLocationMessageClass(status) {
  if (status === "resolved") return "text-emerald-600";
  if (status === "error") return "text-red-600";
  return "text-slate-500";
}

function validateAvailabilityDates(availableFrom, availableTo, today, originalAvailableFrom = "") {
  const errors = {
    available_from: "",
    available_to: "",
  };

  // An existing listing can keep a start date that has already passed.
  if (availableFrom && availableFrom < today && availableFrom !== originalAvailableFrom) {
    errors.available_from = "Available from cannot be earlier than today.";
  }

  if (availableTo && availableFrom && availableTo <= availableFrom) {
    errors.available_to = "Available to must be later than Available from.";
  }

  return errors;
}

function getTodayDateString() {
  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  return today.toISOString().slice(0, 10);
}

function getNextDateString(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + 1);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

async function resolveAddressState(address, signal) {
  try {
    const result = await geocodeAddressToNearestCampus(address, signal);

    return {
      status: "resolved",
      requestAddress: address,
      campus: result.campus,
      distance: result.distance,
      latitude: result.latitude,
      longitude: result.longitude,
      studentCenter: result.studentCenter,
      message: `${result.campus}. ${result.distance} miles from ${result.studentCenter}`,
    };
  } catch (error) {
    if (error.name === "AbortError") throw error;
    return buildLocationErrorState(address);
  }
}

function buildInitialLocationState(listing) {
  const address = listing?.address?.trim() || "";
  const campus = listing?.campus_location || listing?.campus || "";
  if (!address || !campus) return defaultLocationState;

  const distance = listing.distance ?? null;
  return {
    status: "resolved",
    requestAddress: address,
    campus,
    studentCenter: listing.nearestStudentCenter || "",
    distance,
    latitude: listing.latitude ?? null,
    longitude: listing.longitude ?? null,
    message:
      distance != null
        ? `${campus}. ${distance} miles from ${listing.nearestStudentCenter || "campus"}`
        : `${campus}`,
  };
}

function buildLocationErrorState(address) {
  return {
    status: "error",
    requestAddress: address,
    campus: "",
    distance: null,
    latitude: null,
    longitude: null,
    message: "We couldn't estimate the nearest campus from that address yet.",
  };
}
