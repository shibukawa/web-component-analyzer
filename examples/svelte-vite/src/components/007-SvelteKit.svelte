<script>
  import { page } from '$app/stores';
  import { goto, beforeNavigate, afterNavigate } from '$app/navigation';

  // Access page data
  let userId = $page.params.id;
  let searchQuery = $page.url.searchParams.get('q');

  // Navigation function
  function handleNavigate() {
    goto('/dashboard');
  }

  // Navigation lifecycle hooks
  beforeNavigate(({ from, to }) => {
    console.log('Navigating from', from, 'to', to);
  });

  afterNavigate(() => {
    console.log('Navigation complete');
  });
</script>

<div>
  <h1>User ID: {userId}</h1>
  <p>Search: {searchQuery}</p>
  <button on:click={handleNavigate}>Go to Dashboard</button>
</div>
