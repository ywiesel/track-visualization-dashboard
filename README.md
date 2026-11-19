# Track Visualization Dashboard

An interactive dashboard for exploring cell behavior using ground-truth tracks from Dataset 1.

## Run locally

The dashboard loads its data with `fetch`, so serve it over HTTP instead of opening `index.html` directly. From the project root, run:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## GitHub Pages

This is a static site and can be published from the repository root. The included GitHub Actions workflow publishes the site whenever changes are pushed to `main`.

To enable it, open **Settings → Pages** in the GitHub repository and set **Build and deployment → Source** to **GitHub Actions**. After the first successful workflow run, GitHub shows the site URL on that page. For a project repository, the URL is usually `https://<username>.github.io/<repository-name>/`.

## Project structure

```text
.
├── index.html                 # Dashboard page
├── css/style.css              # Page and chart styles
├── js/                        # Dashboard and visualization code
├── data/                      # Dataset manifest, summary, and track CSVs
├── images/                    # Project image assets
├── process-book/              # Visualization process-book material
└── python/                    # Dataset manifest utility
```

The dashboard uses D3.js 7 from jsDelivr. `requirements.txt` lists Python packages for the data utility scripts.
