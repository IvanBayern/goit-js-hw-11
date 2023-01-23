import SimpleLightbox from 'simplelightbox';
import 'simplelightbox/dist/simple-lightbox.min.css';
const _ = require('lodash');
const axios = require('axios').default;

import Notiflix from 'notiflix';
Notiflix.Notify.init({
  position: 'right-top',
  fontSize: '16px',
});
import 'notiflix/dist/notiflix-3.2.5.min.css';

const PIXABAY_KEY = '13063741-5515a23bced967f7d7ac2fd10';
const IMAGE_TYPE = 'photo';
const ORIENTATION = 'horizontal';
const SAFESEARCH = true;
const API = 'https://pixabay.com/api/';
const PER_PAGE = 40;
const GAP = 16;
const HEIGHT_FORM = 36;
const UP_TO_GALLERY = HEIGHT_FORM + GAP;

let currentPage = 1;
let pagesCount = 1;
let searchEnded = false; // search finished
let firstAsk = false; // used at windows.onload only to know that window scrollbar was rendered, becouse I have problem with Element.clientHeight have wrong value when DOM don't fully loaded

const galleryRef = document.querySelector('.gallery');
const lightbox = new SimpleLightbox('.gallery__item', {
  captionsData: 'alt',
  captionDelay: 100,
});
const formRef = document.querySelector('#search-form');
const {
  elements: { searchQuery },
} = formRef;

searchQuery.style.padding = '8px';
searchQuery.style.fontSize = '16px';
searchQuery.style.height = '36px';
searchQuery.style.border = 'none';
searchQuery.style.borderRadius = '4px 0 0 4px';
searchQuery.style.outline = 'none';

const btnRef = searchQuery.nextElementSibling;
btnRef.style.width = '36px';
btnRef.style.border = 'none';
btnRef.style.borderRadius = '0 4px 4px 0';
btnRef.style.cursor = 'pointer';
btnRef.addEventListener('mouseenter', () => {
  btnRef.style.backgroundColor = '#D1D1D1';
});

btnRef.addEventListener('mouseleave', () => {
  btnRef.style.backgroundColor = '#EFEFEF';
});

const debouncedScroll = _.debounce(() => {
  const { height: cardHeight } = galleryRef.firstChild.getBoundingClientRect();

  window.scrollBy({
    top: cardHeight * 2,
    behavior: 'smooth',
  });
}, 1500);
// to know we reach bottom befor pxToBottom pxs
function chackBottom(pxToBottom) {
  const toBottom = document.documentElement.clientHeight + pxToBottom;
  const toBottomOfDoc = document.documentElement.getBoundingClientRect().bottom;

  if (toBottomOfDoc < toBottom && !searchEnded) {
    return true;
  }

  return false;
}

async function getGallery() {
  try {
    const searchParams = new URLSearchParams({
      key: PIXABAY_KEY,
      q: searchQuery.value.split(' ').join('+'),
      image_type: IMAGE_TYPE,
      orientation: ORIENTATION,
      safesearch: SAFESEARCH,
      page: currentPage,
      per_page: PER_PAGE,
    });

    const response = await axios.get(`${API}?${searchParams}`);

    if (response.status !== 200) {
      throw new Error(response.status);
    }

    return response.data;
  } catch (error) {
    Notiflix.Notify.failure(error.message);
  }
}

function normalizedQuery(symbol) {
  searchQuery.value = searchQuery.value.trim().toLowerCase();
  if (symbol === ' ') searchQuery.value += ' ';
}

function renderImages(images) {
  let galleryMarkup = '';

  galleryMarkup = [...images]
    .map(
      ({
        largeImageURL,
        webformatURL,
        tags,
        likes,
        views,
        comments,
        downloads,
      }) => `<a class="gallery__item" href=${largeImageURL}>
  <img class="gallery__img" src="${webformatURL}" alt="${tags
        .split(', ')
        .join(' ')}" loading="lazy" />
  <div class="info">
    <p class="info__item">
      <b>Likes</b>
      ${likes}
    </p>
    <p class="info__item">
      <b>Views</b>
      ${views}
    </p>
    <p class="info__item">
      <b>Comments</b>
      ${comments}
    </p>
    <p class="info__item">
      <b>Downloads</b>
      ${downloads}
    </p>
  </div>
	</a>`
    )
    .join('');

  galleryRef.insertAdjacentHTML('beforeend', galleryMarkup);

  lightbox.refresh();
}

galleryRef.addEventListener('click', event => {
  event.preventDefault();
});

searchQuery.addEventListener('input', event => {
  normalizedQuery(event.data);
});

formRef.addEventListener('submit', event => {
  event.preventDefault();

  galleryRef.setHTML(''); // better then innerHTML = '';

  pagesCount = 1;
  currentPage = 1;
  searchEnded = false;
  firstAsk = true;
  document.removeEventListener('scroll', debouncedScroll);

  getGallery()
    .then(response => {
      const { hits: images, totalHits: totalAmount } = response;
      if (images.length === 0) {
        searchEnded = true;
        throw new Error('Sorry, there are no images matching your search query. Please try again.');
      }

      Notiflix.Notify.success(`Hooray! We found ${totalAmount} images.`);

      pagesCount = Math.trunc(totalAmount / PER_PAGE);
      if (totalAmount % PER_PAGE !== 0) pagesCount += 1;

      renderImages(images);
    })
    .catch(error => {
      Notiflix.Notify.failure(error.message);
    });
});
// need to analize only if we have not scroll event
window.addEventListener('load', () => {
  if (firstAsk && !searchEnded) {
    if (chackBottom(0) && pagesCount === currentPage) {
      Notiflix.Notify.info("We're sorry, but you've reached the end of search results.");
      firstAsk = false;
    }
  }
});

window.addEventListener('scroll', debouncedScroll);

document.addEventListener(
  'scroll',
  _.debounce(event => {
    if (!chackBottom(100)) return;

    if (pagesCount !== currentPage) {
      firstAsk = false;
      currentPage += 1;

      getGallery().then(response => {
        renderImages(response.hits);
      });
      return;
    }

    Notiflix.Notify.info("We're sorry, but you've reached the end of search results.");
    searchEnded = true;
  }, 500)
);
