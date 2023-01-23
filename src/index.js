import SimpleLightbox from 'simplelightbox';
import 'simplelightbox/dist/simple-lightbox.min.css';
import { Notify } from 'notiflix/build/notiflix-notify-aio';
import axios from 'axios';

const slider = new SimpleLightbox('.gallery a');

class ImageSearch {
  constructor({ form, searchBtn, gallery }, URI) {
    this.form = form;
    this.searchBtn = searchBtn;
    this.gallery = gallery;
    this.URI = URI;
    this.pageCounter = 1;
    this.searchValue = 'cat';
  }

  init() {
    this.addListeners();
  }

  addListeners() {
    this.form.addEventListener('submit', this.onSubmit.bind(this));
    window.addEventListener('scroll', this.endlessScroll.bind(this));
  }

  onSubmit(evt) {
    evt.preventDefault();

    this.searchValue = evt.currentTarget.elements.searchQuery.value;

    if (this.searchValue === '') {
      Notify.failure('Please clarify your search');
      return;
    }

    this.gallery.innerHTML = '';
    this.pageCounter = 1;
    this.getImages();
  }

  async getImages(action = 'submit') {
    try {
      const query = `&q=${this.searchValue}`;
      const URI = this.URI + this.pageCounter + query;

      const response = await axios.get(URI);

      this.handleRes(response);
      this.smoothScroll();

      if (action === 'scroll') {
        Notify.success(
          `Here you have another ${response.data.hits.length} images`
        );
        return;
      }

      Notify.success(`Hooray! We found ${response.data.totalHits} images.`);
    } catch (err) {
      this.handleError(err);
    }
  }

  handleRes({ data }) {
    if (data.total === 0) {
      throw new Error('No matches found');
    }

    if (data.hits.length === 0) {
      throw new Error('End of collection');
    }

    this.renderCards(data.hits);

    slider.refresh();
  }

  handleError(err) {
    if (err.name === 'AxiosError') {
      console.log(err.response);
      Notify.failure(
        "We're sorry, but you've reached the end of search results."
      );
      return;
    }

    if (err.message === 'End of collection') {
      Notify.failure(
        "We're sorry, but you've reached the end of search results."
      );
      return;
    }

    console.log(err);
    Notify.failure(
      'Sorry, there are no images matching your search query. Please try again.'
    );
  }

  renderCards(imagesArr) {
    const markup = imagesArr
      .map(
        ({
          webformatURL,
          downloads,
          likes,
          views,
          comments,
          largeImageURL,
          tags,
        }) =>
          `<div class="photo-card"><a class="photo-card__link" href=${largeImageURL}>
      <img class="photo-card__image" src="${webformatURL}" alt="${tags}" loading="lazy" width="375"  /></a>
      <div class="info">
        <p class="info-item">
          <b>Likes</b>
            ${likes}
        </p>
        <p class="info-item">
          <b>Views</b>
          ${views}
        </p>
        <p class="info-item">
          <b>Comments</b>
          ${comments}
        </p>
        <p class="info-item">
          <b>Downloads</b>
          ${downloads}
        </p>
      </div>
    </div>`
      )
      .join('');

    this.gallery.innerHTML += markup;
  }

  endlessScroll() {
    const { scrollHeight, scrollTop, clientHeight } = document.documentElement;

    if (scrollHeight < 1500) {
      return;
    }

    if (scrollTop + clientHeight === scrollHeight) {
      this.pageCounter += 1;
      this.getImages('scroll');
    }
  }

  smoothScroll() {
    const { height: cardHeight } =
      this.gallery.firstElementChild.getBoundingClientRect();

    window.scrollBy({
      top: cardHeight * 2,
      behavior: 'smooth',
    });
  }
}

const URI =
  'https://pixabay.com/api/?key=31237471-5a493734838c09426069ada78&image_type=photo&orientation=horizontal&safesearch=true&per_page=40&page=';

const refs = {
  form: document.querySelector('#search-form'),
  searchBtn: document.querySelector('button[type="submit"]'),
  gallery: document.querySelector('.gallery'),
};

new ImageSearch(refs, URI).init();
