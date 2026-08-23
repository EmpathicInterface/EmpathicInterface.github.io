document.addEventListener("DOMContentLoaded", () => {
    const publicationList = document.getElementById("publication-list");

    if (!publicationList) {
        return;
    }

    fetch("assets/pubdata/publications.bib")
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load publications.bib: ${response.status}`);
            }

            return response.text();
        })
        .then(bibtex => {
            const publications = parseBibTeX(bibtex);
            renderPublications(publications, publicationList);
        })
        .catch(error => {
            console.error("Publication loading error:", error);

            publicationList.innerHTML = `
                <p class="publication-error">
                    Publications could not be loaded.
                </p>
            `;
        });
});


function parseBibTeX(bibtex) {
    const entries = [];
    let position = 0;

    while (position < bibtex.length) {

        const atIndex = bibtex.indexOf("@", position);

        if (atIndex === -1) {
            break;
        }

        const openBrace = bibtex.indexOf("{", atIndex);

        if (openBrace === -1) {
            break;
        }

        const entryType = bibtex
            .substring(atIndex + 1, openBrace)
            .trim()
            .toLowerCase();

        const commaIndex = bibtex.indexOf(",", openBrace);

        if (commaIndex === -1) {
            break;
        }

        const key = bibtex
            .substring(openBrace + 1, commaIndex)
            .trim();

        let depth = 1;
        let endIndex = commaIndex + 1;

        while (endIndex < bibtex.length && depth > 0) {

            if (bibtex[endIndex] === "{") {
                depth++;
            } else if (bibtex[endIndex] === "}") {
                depth--;
            }

            endIndex++;
        }

        const content = bibtex.substring(
            commaIndex + 1,
            endIndex - 1
        );

        entries.push({
            type: entryType,
            key,
            ...parseFields(content)
        });

        position = endIndex;
    }

    return entries;
}


function parseFields(content) {
    const fields = {};
    let position = 0;

    while (position < content.length) {

        while (
            position < content.length &&
            (/\s/.test(content[position]) || content[position] === ",")
        ) {
            position++;
        }

        if (position >= content.length) {
            break;
        }

        const equalsIndex = content.indexOf("=", position);

        if (equalsIndex === -1) {
            break;
        }

        const fieldName = content
            .substring(position, equalsIndex)
            .trim()
            .toLowerCase();

        position = equalsIndex + 1;

        while (
            position < content.length &&
            /\s/.test(content[position])
        ) {
            position++;
        }

        let value = "";

        if (content[position] === "{") {

            const start = position + 1;
            let depth = 1;
            position++;

            while (position < content.length && depth > 0) {

                if (content[position] === "{") {
                    depth++;
                } else if (content[position] === "}") {
                    depth--;
                }

                position++;
            }

            value = content.substring(start, position - 1);

        } else if (content[position] === '"') {

            const start = position + 1;
            position++;

            while (
                position < content.length &&
                content[position] !== '"'
            ) {
                position++;
            }

            value = content.substring(start, position);
            position++;

        } else {

            const start = position;

            while (
                position < content.length &&
                content[position] !== ","
            ) {
                position++;
            }

            value = content.substring(start, position);
        }

        fields[fieldName] = cleanBibTeX(value);
    }

    return fields;
}


function cleanBibTeX(value) {
    return value
        .replace(/[{}]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}


function formatAuthors(authorString) {
    if (!authorString) {
        return "";
    }

    return authorString
        .split(/\s+and\s+/i)
        .map(author => {

            const parts = author
                .split(",")
                .map(part => part.trim());

            if (parts.length >= 2) {
                return `${parts[1]} ${parts[0]}`;
            }

            return parts[0];
        })
        .join(", ");
}


function renderPublications(publications, container) {

    if (publications.length === 0) {
        container.innerHTML = `
            <p class="publication-empty">
                No publications available.
            </p>
        `;
        return;
    }


    // Sort by year: newest first
    publications.sort((a, b) => {
        return Number.parseInt(b.year || "0", 10)
             - Number.parseInt(a.year || "0", 10);
    });


    // Group publications by year
    const grouped = {};

    publications.forEach(publication => {

        const year = publication.year || "Other";

        if (!grouped[year]) {
            grouped[year] = [];
        }

        grouped[year].push(publication);

    });


    // Sort years: newest first
    const years = Object.keys(grouped).sort((a, b) => {

        if (a === "Other") {
            return 1;
        }

        if (b === "Other") {
            return -1;
        }

        return Number.parseInt(b, 10)
             - Number.parseInt(a, 10);
    });


    container.innerHTML = "";


    // Render each year
    years.forEach(year => {

        const yearSection = document.createElement("section");
        yearSection.className = "publication-year";


        const yearHeading = document.createElement("h2");
        yearHeading.textContent = year;

        yearSection.appendChild(yearHeading);


        // Render publications within the year
        grouped[year].forEach((publication, index) => {

            const item = document.createElement("article");
            item.className = "publication-item";


            const details = document.createElement("span");
            details.className = "publication-details";


            // Number
            const number = document.createElement("span");
            number.className = "publication-number";
            number.textContent = `${index + 1}. `;

            details.appendChild(number);


            // Title
            const title = document.createElement("span");
            title.className = "publication-title";
            title.textContent =
                publication.title || "Untitled Publication.";

            details.appendChild(title);


            // Authors
            if (publication.author) {

                const authors = document.createElement("span");
                authors.className = "publication-authors";

                authors.textContent =
                    `. ${formatAuthors(publication.author)}.`;

                details.appendChild(authors);
            }


            // Venue
            const venue =
                publication.booktitle ||
                publication.journal ||
                publication.publisher;

            if (venue) {

                const venueElement = document.createElement("span");
                venueElement.className = "publication-venue";

                venueElement.textContent =
                    ` ${venue}`;

                details.appendChild(venueElement);
            }


            // Pages
            if (publication.pages) {

                const pages = document.createElement("span");
                pages.className = "publication-pages";

                pages.textContent =
                    `, pp. ${publication.pages}.`;

                details.appendChild(pages);
            }


            // DOI
            if (publication.doi) {

                const doiLink = document.createElement("a");

                doiLink.href =
                    `https://doi.org/${publication.doi}`;

                doiLink.target = "_blank";
                doiLink.rel = "noopener noreferrer";

                doiLink.textContent = " DOI";

                details.appendChild(doiLink);
            }


            // Paper URL
            if (publication.url) {

                const paperLink = document.createElement("a");

                paperLink.href = publication.url;
                paperLink.target = "_blank";
                paperLink.rel = "noopener noreferrer";

                paperLink.textContent = " [Paper]";

                details.appendChild(paperLink);
            }


            item.appendChild(details);
            yearSection.appendChild(item);

        });


        container.appendChild(yearSection);

    });

}