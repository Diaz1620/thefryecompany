if (window.location.href.includes("submissions/search_master_product")) {
    const interval = setInterval(() => {
        const select = document.querySelector("select[name='Size']");
        if (select) {
            window.clearInterval(interval);
            sortSizeOptions(select);
        }

        if (!window.location.href.includes("submissions/search_master_product")) {
            window.clearInterval(interval);
        }
    }, 1000)
    
    function sortSizeOptions(select) {
        const options = select.children;
        const sortedOptions = Array.from(options).sort(((a, b) => a.value - b.value));
        select.innerHTML = "";
        select.append(...sortedOptions);
    }
}