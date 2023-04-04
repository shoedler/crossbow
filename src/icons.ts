import { addIcon } from 'obsidian';

const crossbowIcon = {
  name: 'crossbow',
  svg: `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512.002 512.002" xmlns:v="https://vecta.io/nano" fill="currentColor">
    <path d="M505.753 354.901l-15.083-15.083c-19.702-19.702-49.044-23.859-72.839-12.5l-43.878-43.878-13.906-208.61 23.327-23.327c8.331-8.331 8.331-21.839 0-30.17s-21.839-8.331-30.17 0l-30.165 30.165c-16.716 16.716-68.646 36.398-92.869 41.533-11.745 2.518-23.28 6.645-34.556 12.071l-53.605-53.605c-8.332-8.332-21.842-8.331-30.173.003l-15.08 15.086-23.91-23.91h8.819c11.782 0 21.333-9.551 21.333-21.333S93.447.01 81.665.01H21.513a21.41 21.41 0 0 0-4.441.428c-.103.021-.201.052-.304.074-.578.126-1.152.268-1.72.442-.134.041-.263.094-.395.138-.528.174-1.054.358-1.57.575-.12.05-.234.111-.353.164-.517.228-1.029.467-1.53.737-.091.049-.177.107-.268.158-.511.285-1.017.584-1.509.916-.061.041-.116.088-.177.13-1.052.726-2.061 1.54-2.996 2.476-.885.885-1.655 1.838-2.351 2.826-.09.127-.189.245-.275.374-.281.418-.53.849-.779 1.282-.099.172-.208.336-.302.511-.218.406-.407.822-.597 1.238-.101.221-.212.435-.306.66-.161.389-.295.785-.432 1.18-.093.266-.197.527-.279.798-.117.384-.204.773-.299 1.162-.071.291-.154.577-.213.872-.086.431-.14.866-.199 1.301-.035.258-.086.511-.111.771-.07.703-.107 1.409-.107 2.114v60.335c0 11.782 9.551 21.333 21.333 21.333s21.333-9.551 21.333-21.333v-8.836L66.591 96.76l-15.086 15.091c-8.329 8.332-8.327 21.838.003 30.168l53.066 53.062c-4.78 9.663-8.35 19.301-10.444 28.877a92.9 92.9 0 0 0-1.378 7.89c-1.967 15.328-24.484 74.421-41.245 91.182l-30.165 30.165c-8.331 8.331-8.331 21.839 0 30.17s21.839 8.331 30.17 0l23.318-23.318 208.628 13.906 43.863 43.86c-11.366 23.793-7.209 53.155 12.495 72.859l15.083 15.083c8.331 8.331 21.839 8.331 30.17 0l120.683-120.683c8.332-8.332 8.332-21.84.001-30.171zM158.582 188.747c2.639-3.559 5.336-6.989 8.038-10.208 2.747-3.272 4.819-5.561 5.868-6.653.571-.543 2.88-2.632 6.269-5.428 3.156-2.604 6.54-5.211 10.105-7.768l148.811 148.811.018.018 47.378 47.378-30.161 30.161-196.326-196.311zm80.484-53.987c7.095-1.504 28.104-7.881 46.173-14.729 12.532-4.75 23.942-9.708 34.064-14.941l8.834 132.535-99.868-99.868c3.626-1.223 7.23-2.232 10.797-2.997zm-127.433-22.707c.072-.07.15-.129.221-.2s.131-.151.202-.223l14.871-14.876 31.395 31.395c-6.755 5.127-12.201 9.867-16.113 13.686-4.056 4.209-8.919 9.76-14.107 16.434L96.761 126.93l14.872-14.877zm-6.789 207.232c15.579-29.378 28.148-65.788 30.226-81.986.174-1.348.423-2.765.743-4.228a64.51 64.51 0 0 1 1.427-5.328l100.401 100.394-132.797-8.852zm265.141 141.214c-8.315-8.317-8.325-21.807-.035-30.139.015-.015.032-.028.047-.043l60.331-60.331c.013-.013.024-.028.037-.041a21.35 21.35 0 0 1 30.132.041l-90.512 90.513z"/>
  </svg>
  `,
};

export const registerCrossbowIcons = () => {
  addIcon(crossbowIcon.name, crossbowIcon.svg);
};
