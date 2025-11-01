import { fetchJSON, renderProjects } from "../global.js";
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// --- D3 Globals ---
const colors = d3.scaleOrdinal(d3.schemeTableau10);
const arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
const svg = d3.select('#projects-pie-plot');
const legend = d3.select('.legend');

// --- State Variables (for Extra Credit) ---
let globalProjects = []; // To store the original, full list of projects
let currentQuery = '';
let selectedIndex = -1;
let currentPieData = []; // To map index to year

// Selectors
const projectsContainer = document.querySelector('.projects');
const searchInput = document.querySelector('.searchBar');

/**
 * Updates the project list and pie chart based on the
 * current state of `currentQuery` and `selectedIndex`.
 * This solves the Step 5.4 bug.
 */
function updateVisuals() {
    // 1. Filter projects by the search query
    const searchFilteredProjects = globalProjects.filter((project) => {
        const values = Object.values(project).join('\n').toLowerCase();
        return values.includes(currentQuery);
    });

    // 2. Determine the selected year (if any)
    const selectedYear = (selectedIndex !== -1 && currentPieData[selectedIndex])
        ? currentPieData[selectedIndex].label
        : null;

    // 3. Filter the *search-filtered* list by the selected year
    const finalFilteredProjects = selectedYear
        ? searchFilteredProjects.filter(p => p.year === selectedYear)
        : searchFilteredProjects;

    // 4. Re-render the project list and the pie chart
    renderProjects(finalFilteredProjects, projectsContainer);
    renderPieChart(searchFilteredProjects); // Pie chart updates with search
}

/**
 * Renders the pie chart and legend.
 * @param {Array} projectsGiven - The array of projects to visualize.
 */
function renderPieChart(projectsGiven) {
    // 1. Clear existing chart and legend
    svg.selectAll('path').remove();
    legend.selectAll('li').remove();

    // 2. Group and map data
    const rolledData = d3.rollups(projectsGiven, v => v.length, d => d.year);
    currentPieData = rolledData.map(([year, count]) => ({ value: count, label: year }));

    // 3. Create slices
    const sliceGenerator = d3.pie().value((d) => d.value).sort(null); // Keep order
    const arcData = sliceGenerator(currentPieData);

    // 4. Draw new chart slices
    arcData.forEach((d, i) => {
        svg.append('path')
           .attr('d', arcGenerator(d))
           .attr('fill', colors(i))
           .attr('class', 'wedge' + (i === selectedIndex ? ' selected' : '')) // Apply .selected class
           .on('click', () => {
                // Update state and re-render
                selectedIndex = (selectedIndex === i) ? -1 : i; // Toggle selection [cite: 748]
                updateVisuals();
           });
    });

    // 5. Create new legend
    currentPieData.forEach((d, i) => {
        legend
            .append('li')
            .attr('class', 'legend-item' + (i === selectedIndex ? ' selected' : '')) // Apply .selected class
            .attr('style', `--color: ${colors(i)}`)
            .html(`<span class="swatch" style="background-color: ${colors(i)}"></span> ${d.label} <em>(${d.value})</em>`)
            .on('click', () => {
                // Update state and re-render
                selectedIndex = (selectedIndex === i) ? -1 : i; // Toggle selection
                updateVisuals();
            });
    });
}

async function main() {
    globalProjects = await fetchJSON('../lib/projects.json');

    if (globalProjects && projectsContainer) {
        // Initial render
        updateVisuals();
    }

    // --- Event Listener for Search Bar ---
    searchInput.addEventListener('input', (event) => {
        currentQuery = event.target.value.toLowerCase();
        // When searching, reset the pie selection to avoid confusion
        // selectedIndex = -1; 
        // Or, to keep selection (as per extra credit):
        updateVisuals();
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    await main();
});