import { fetchJSON, renderProjects } from "../global.js";
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// --- D3 Globals ---
const colors = d3.scaleOrdinal(d3.schemeTableau10);
const arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
const svg = d3.select('#projects-pie-plot');
const legend = d3.select('.legend');

let globalProjects = [];
let currentQuery = '';
let selectedIndex = -1;
let currentPieData = [];

const projectsContainer = document.querySelector('.projects');
const searchInput = document.querySelector('.searchBar');

function updateVisuals() {
    const searchFilteredProjects = globalProjects.filter((project) => {
        const values = Object.values(project).join('\n').toLowerCase();
        return values.includes(currentQuery);
    });

    const selectedYear = (selectedIndex !== -1 && currentPieData[selectedIndex])
        ? currentPieData[selectedIndex].label
        : null;

    const finalFilteredProjects = selectedYear
        ? searchFilteredProjects.filter(p => p.year === selectedYear)
        : searchFilteredProjects;

    renderProjects(finalFilteredProjects, projectsContainer);
    renderPieChart(searchFilteredProjects);
}

/**
 * Renders the pie chart and legend.
 * @param {Array} projectsGiven - The array of projects to visualize.
 */
function renderPieChart(projectsGiven) {
    svg.selectAll('path').remove();
    legend.selectAll('li').remove();

    const rolledData = d3.rollups(projectsGiven, v => v.length, d => d.year);
    currentPieData = rolledData.map(([year, count]) => ({ value: count, label: year }));

    const sliceGenerator = d3.pie().value((d) => d.value).sort(null);
    const arcData = sliceGenerator(currentPieData);

    arcData.forEach((d, i) => {
        svg.append('path')
           .attr('d', arcGenerator(d))
           .attr('fill', colors(i))
           .attr('class', 'wedge' + (i === selectedIndex ? ' selected' : ''))
           .on('click', () => {
                selectedIndex = (selectedIndex === i) ? -1 : i;
                updateVisuals();
           });
    });

    // 5. Create new legend
    currentPieData.forEach((d, i) => {
        legend
            .append('li')
            .attr('class', 'legend-item' + (i === selectedIndex ? ' selected' : ''))
            .attr('style', `--color: ${colors(i)}`)
            .html(`<span class="swatch" style="background-color: ${colors(i)}"></span> ${d.label} <em>(${d.value})</em>`)
            .on('click', () => {
                selectedIndex = (selectedIndex === i) ? -1 : i;
                updateVisuals();
            });
    });
}

async function main() {
    globalProjects = await fetchJSON('../lib/projects.json');

    if (globalProjects && projectsContainer) {
        updateVisuals();
    }

    searchInput.addEventListener('input', (event) => {
        currentQuery = event.target.value.toLowerCase();
        updateVisuals();
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    await main();
});