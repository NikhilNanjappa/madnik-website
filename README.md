# madnik.co.uk static site

Official website for **Madnik Limited**.

## Products

- [Easy VAT](/product/easy-vat/index.html)

## File structure

```
madnik-website/
├── index.html              # Company homepage
├── privacy.html            # (host on server if not in repo)
├── terms.html              # (host on server if not in repo)
├── product/easy-vat/
│   └── index.html          # Easy VAT product page + App Store CTAs
└── assets/
    └── google-g.svg        # Optional; product page no longer uses OAuth
```

## Local preview

```bash
cd madnik-website
python3 -m http.server 8080
# open http://localhost:8080/product/easy-vat/
```
