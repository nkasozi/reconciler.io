<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount, onDestroy } from 'svelte';
  
  let isAnnual = true;
  let isHoveredPro = false;
  let isHoveredEnterprise = false;
  let upgradeNotice = $state<string | null>(null);
  
  // Check for upgrade prompt from file upload
  onMount(() => {
    // Get the upgrade reason from session storage
    const reason = sessionStorage.getItem('upgrade_reason');
    if (reason) {
      upgradeNotice = reason;
      // Highlight the Pro tier
      isHoveredPro = true;
      setTimeout(() => {
        // Reset the highlighting after 3 seconds
        isHoveredPro = false;
      }, 3000);
    }
  });
  
  onDestroy(() => {
    // Clear the upgrade reason when navigating away
    sessionStorage.removeItem('upgrade_reason');
  });
  
  function switchBilling() {
    isAnnual = !isAnnual;
  }
  
  function getPrice(monthly: number): string {
    if (isAnnual) {
      return `$${(monthly * 10).toFixed(0)}`;
    }
    return `$${monthly}`;
  }
  
  function getPeriod(): string {
    return isAnnual ? '/year' : '/month';
  }
  
  function contactEmail() {
    window.location.href = 'mailto:nkasozi@gmail.com?subject=Reconciler%20Pro%20Trial%20Request';
  }
  
  function contactSales() {
    window.location.href = 'mailto:nkasozi@gmail.com?subject=Reconciler%20Enterprise%20Inquiry';
  }
</script>

<svelte:head>
  <title>Pricing | Reconcile - Data Reconciliation Made Simple</title>
  <meta name="description" content="Simple, transparent pricing for all your data reconciliation needs." />
</svelte:head>

<div class="bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 py-16">
  <div class="container mx-auto px-4">
    <!-- Upgrade notice -->
    {#if upgradeNotice}
      <div class="mx-auto max-w-3xl mb-8">
        <div class="bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-yellow-500 p-4 rounded">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm text-yellow-800 dark:text-yellow-200">{upgradeNotice}</p>
            </div>
          </div>
        </div>
      </div>
    {/if}
    
    <div class="text-center mb-16">
      <h1 class="text-4xl md:text-5xl font-bold mb-4 text-gray-900 dark:text-white">
        Simple, Transparent <span class="text-blue-600 dark:text-blue-400">Pricing</span>
      </h1>
      <p class="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
        Choose the plan that works best for your reconciliation needs
      </p>
      
      <!-- Billing toggle -->
      <div class="flex items-center justify-center mt-8">
        <span class={`text-sm ${isAnnual ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-500 dark:text-gray-400'}`}>Monthly</span>
        <button 
          class="relative mx-4 flex h-6 w-12 items-center rounded-full bg-blue-600 dark:bg-blue-500 px-0.5"
          on:click={switchBilling}
          aria-label={isAnnual ? "Switch to monthly billing" : "Switch to annual billing"}
        >
          <span class={`absolute h-5 w-5 rounded-full bg-white transform transition-transform duration-300 ${isAnnual ? 'translate-x-6' : 'translate-x-0'}`}></span>
        </button>
        <span class={`text-sm ${!isAnnual ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white font-medium'}`}>
          Annual <span class="text-green-500 font-medium ml-1">Save 15%</span>
        </span>
      </div>
    </div>

    <!-- Pricing Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 max-w-5xl mx-auto">
      <!-- Free Tier -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden transition-all duration-300 border border-transparent">
        <div class="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2">Free</h3>
          <div class="flex items-end gap-1 mb-4">
            <span class="text-4xl font-bold text-gray-900 dark:text-white">$0</span>
            <span class="text-gray-500 dark:text-gray-400 pb-1">forever</span>
          </div>
          <p class="text-gray-600 dark:text-gray-300 text-sm">
            Perfect for occasional reconciliation tasks
          </p>
        </div>
        <div class="p-6">
          <ul class="space-y-3">
            <li class="flex items-start">
              <svg class="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span class="ml-2 text-gray-600 dark:text-gray-300">Upload & reconcile up to 10,000 rows</span>
            </li>
            <li class="flex items-start">
              <svg class="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span class="ml-2 text-gray-600 dark:text-gray-300">Basic column mapping</span>
            </li>
            <li class="flex items-start">
              <svg class="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span class="ml-2 text-gray-600 dark:text-gray-300">CSV & Excel support</span>
            </li>
            <li class="flex items-start">
              <svg class="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span class="ml-2 text-gray-600 dark:text-gray-300">Basic reconciliation reporting</span>
            </li>
            <li class="flex items-start">
              <svg class="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
              <span class="ml-2 text-gray-500 dark:text-gray-400">Advanced analysis features</span>
            </li>
          </ul>
          <button 
            on:click={() => goto('/upload')}
            class="mt-8 w-full py-3 px-4 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium transition duration-300 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white"
          >
            Get Started
          </button>
        </div>
      </div>

      <!-- Pro Tier -->
      <div 
        class={`bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden transform transition-all duration-300 ${isHoveredPro ? 'scale-105' : ''} border-2 border-blue-500`}
        on:mouseenter={() => isHoveredPro = true}
        on:mouseleave={() => isHoveredPro = false}
      >
        <div class="bg-blue-500 text-white py-2 px-4 text-sm font-semibold text-center">
          MOST POPULAR
        </div>
        <div class="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2">Pro</h3>
          <div class="flex items-end gap-1 mb-4">
            <span class="text-4xl font-bold text-gray-900 dark:text-white">{getPrice(29)}</span>
            <span class="text-gray-500 dark:text-gray-400 pb-1">{getPeriod()}</span>
          </div>
          <p class="text-gray-600 dark:text-gray-300 text-sm">
            For teams that need advanced features
          </p>
        </div>
        <div class="p-6">
          <ul class="space-y-3">
            <li class="flex items-start">
              <svg class="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span class="ml-2 text-gray-600 dark:text-gray-300">Up to 100,000 rows per file</span>
            </li>
            <li class="flex items-start">
              <svg class="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span class="ml-2 text-gray-600 dark:text-gray-300">Advanced column mapping</span>
            </li>
            <li class="flex items-start">
              <svg class="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span class="ml-2 text-gray-600 dark:text-gray-300">Support for all file formats</span>
            </li>
            <li class="flex items-start">
              <svg class="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span class="ml-2 text-gray-600 dark:text-gray-300">Interactive failure analysis</span>
            </li>
            <li class="flex items-start">
              <svg class="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span class="ml-2 text-gray-600 dark:text-gray-300">Reverse reconciliation</span>
            </li>
            <li class="flex items-start">
              <svg class="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span class="ml-2 text-gray-600 dark:text-gray-300">Duplicate handling in comparison files</span>
            </li>
            <li class="flex items-start">
              <svg class="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span class="ml-2 text-gray-600 dark:text-gray-300">Continuous comparison after failures</span>
            </li>
            <li class="flex items-start">
              <svg class="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span class="ml-2 text-gray-600 dark:text-gray-300">Results history</span>
            </li>
            <li class="flex items-start">
              <svg class="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span class="ml-2 text-gray-600 dark:text-gray-300">Priority email support</span>
            </li>
          </ul>
          <button 
            on:click={contactEmail}
            class="mt-8 w-full py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition duration-300"
          >
            Start Pro Trial
          </button>
        </div>
      </div>

      <!-- Enterprise Tier -->
      <div 
        class={`bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-transparent transition-all duration-300 ${isHoveredEnterprise ? 'scale-105' : ''}`}
        on:mouseenter={() => isHoveredEnterprise = true}
        on:mouseleave={() => isHoveredEnterprise = false}
      >
        <div class="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2">Enterprise</h3>
          <div class="flex items-end gap-1 mb-4">
            <span class="text-4xl font-bold text-gray-900 dark:text-white">{getPrice(99)}</span>
            <span class="text-gray-500 dark:text-gray-400 pb-1">{getPeriod()}</span>
          </div>
          <p class="text-gray-600 dark:text-gray-300 text-sm">
            For organizations with complex reconciliation needs
          </p>
        </div>
        <div class="p-6">
          <ul class="space-y-3">
            <li class="flex items-start">
              <svg class="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span class="ml-2 text-gray-600 dark:text-gray-300">Unlimited rows and file size</span>
            </li>
            <li class="flex items-start">
              <svg class="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span class="ml-2 text-gray-600 dark:text-gray-300">Custom reconciliation rules</span>
            </li>
            <li class="flex items-start">
              <svg class="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span class="ml-2 text-gray-600 dark:text-gray-300">API access & integrations</span>
            </li>
            <li class="flex items-start">
              <svg class="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span class="ml-2 text-gray-600 dark:text-gray-300">Advanced reconciliation analytics</span>
            </li>
            <li class="flex items-start">
              <svg class="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span class="ml-2 text-gray-600 dark:text-gray-300">Multiple concurrent reconciliations</span>
            </li>
            <li class="flex items-start">
              <svg class="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span class="ml-2 text-gray-600 dark:text-gray-300">Reconciliation categories with alerts</span>
            </li>
            <li class="flex items-start">
              <svg class="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span class="ml-2 text-gray-600 dark:text-gray-300">Advanced configuration options</span>
            </li>
            <li class="flex items-start">
              <svg class="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span class="ml-2 text-gray-600 dark:text-gray-300">Multi-user notifications</span>
            </li>
            <li class="flex items-start">
              <svg class="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span class="ml-2 text-gray-600 dark:text-gray-300">Dedicated account manager</span>
            </li>
          </ul>
          <button 
            on:click={contactSales}
            class="mt-8 w-full py-3 px-4 rounded-lg bg-gray-800 hover:bg-gray-900 text-white font-medium transition duration-300 dark:bg-gray-700 dark:hover:bg-gray-600"
          >
            Contact Sales
          </button>
        </div>
      </div>
    </div>

    <!-- Feature Comparison Table -->
    <div class="max-w-5xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden mb-16">
      <div class="p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Feature Comparison</h2>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="bg-gray-50 dark:bg-gray-700">
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Feature</th>
              <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Free</th>
              <th class="px-6 py-3 text-center text-xs font-medium text-blue-600 uppercase tracking-wider dark:text-blue-400">Pro</th>
              <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Enterprise</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
            <tr>
              <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">Maximum rows</td>
              <td class="px-6 py-4 text-sm text-center text-gray-700 dark:text-gray-300">10,000</td>
              <td class="px-6 py-4 text-sm text-center text-gray-700 dark:text-gray-300">100,000</td>
              <td class="px-6 py-4 text-sm text-center text-gray-700 dark:text-gray-300">Unlimited</td>
            </tr>
            <tr>
              <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">File formats</td>
              <td class="px-6 py-4 text-sm text-center text-gray-700 dark:text-gray-300">CSV, Excel</td>
              <td class="px-6 py-4 text-sm text-center text-gray-700 dark:text-gray-300">All formats</td>
              <td class="px-6 py-4 text-sm text-center text-gray-700 dark:text-gray-300">All formats + Custom</td>
            </tr>
            <tr>
              <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">Interactive failure analysis</td>
              <td class="px-6 py-4 text-center">
                <svg class="h-5 w-5 text-red-500 mx-auto" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </td>
              <td class="px-6 py-4 text-center">
                <svg class="h-5 w-5 text-green-500 mx-auto" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </td>
              <td class="px-6 py-4 text-center">
                <svg class="h-5 w-5 text-green-500 mx-auto" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </td>
            </tr>
            <tr>
              <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">Advanced reporting</td>
              <td class="px-6 py-4 text-center">
                <svg class="h-5 w-5 text-red-500 mx-auto" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </td>
              <td class="px-6 py-4 text-center">
                <svg class="h-5 w-5 text-green-500 mx-auto" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </td>
              <td class="px-6 py-4 text-center">
                <svg class="h-5 w-5 text-green-500 mx-auto" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </td>
            </tr>
            <tr>
              <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">Reverse reconciliation</td>
              <td class="px-6 py-4 text-center">
                <svg class="h-5 w-5 text-red-500 mx-auto" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </td>
              <td class="px-6 py-4 text-center">
                <svg class="h-5 w-5 text-green-500 mx-auto" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </td>
              <td class="px-6 py-4 text-center">
                <svg class="h-5 w-5 text-green-500 mx-auto" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </td>
            </tr>
            <tr>
              <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">Duplicate handling</td>
              <td class="px-6 py-4 text-center">
                <svg class="h-5 w-5 text-red-500 mx-auto" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </td>
              <td class="px-6 py-4 text-center">
                <svg class="h-5 w-5 text-green-500 mx-auto" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </td>
              <td class="px-6 py-4 text-center">
                <svg class="h-5 w-5 text-green-500 mx-auto" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </td>
            </tr>
            <tr>
              <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">Results history</td>
              <td class="px-6 py-4 text-center">
                <svg class="h-5 w-5 text-red-500 mx-auto" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </td>
              <td class="px-6 py-4 text-center">
                <svg class="h-5 w-5 text-green-500 mx-auto" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </td>
              <td class="px-6 py-4 text-center">
                <svg class="h-5 w-5 text-green-500 mx-auto" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </td>
            </tr>
            <tr>
              <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">Multiple concurrent reconciliations</td>
              <td class="px-6 py-4 text-center">
                <svg class="h-5 w-5 text-red-500 mx-auto" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </td>
              <td class="px-6 py-4 text-center">
                <svg class="h-5 w-5 text-red-500 mx-auto" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </td>
              <td class="px-6 py-4 text-center">
                <svg class="h-5 w-5 text-green-500 mx-auto" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </td>
            </tr>
            <tr>
              <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">API access</td>
              <td class="px-6 py-4 text-center">
                <svg class="h-5 w-5 text-red-500 mx-auto" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </td>
              <td class="px-6 py-4 text-center">
                <svg class="h-5 w-5 text-red-500 mx-auto" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </td>
              <td class="px-6 py-4 text-center">
                <svg class="h-5 w-5 text-green-500 mx-auto" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </td>
            </tr>
            <tr>
              <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">Advanced configuration options</td>
              <td class="px-6 py-4 text-center">
                <svg class="h-5 w-5 text-red-500 mx-auto" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </td>
              <td class="px-6 py-4 text-center">
                <svg class="h-5 w-5 text-red-500 mx-auto" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </td>
              <td class="px-6 py-4 text-center">
                <svg class="h-5 w-5 text-green-500 mx-auto" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </td>
            </tr>
            <tr>
              <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">Priority support</td>
              <td class="px-6 py-4 text-center">
                <svg class="h-5 w-5 text-red-500 mx-auto" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </td>
              <td class="px-6 py-4 text-center">
                <svg class="h-5 w-5 text-green-500 mx-auto" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </td>
              <td class="px-6 py-4 text-center">
                <svg class="h-5 w-5 text-green-500 mx-auto" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- FAQ Section -->
    <div class="max-w-3xl mx-auto mb-16">
      <h2 class="text-2xl font-bold text-center mb-8 text-gray-900 dark:text-white">Frequently Asked Questions</h2>
      
      <div class="space-y-4">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Can I upgrade or downgrade my plan at any time?
          </h3>
          <p class="text-gray-600 dark:text-gray-300">
            Yes, you can upgrade or downgrade your subscription at any time. When upgrading, you'll get immediate access to the new features. When downgrading, the changes will take effect at the end of your current billing cycle.
          </p>
        </div>
        
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Is there a money-back guarantee?
          </h3>
          <p class="text-gray-600 dark:text-gray-300">
            Yes, we offer a 14-day money-back guarantee for all paid plans. If you're not satisfied with our service within the first 14 days of your subscription, you can request a full refund, no questions asked.
          </p>
        </div>
        
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Do you offer custom pricing for larger teams?
          </h3>
          <p class="text-gray-600 dark:text-gray-300">
            Yes, we offer custom pricing for teams with specific needs. Please contact our sales team to discuss your requirements and get a tailored quote. Enterprise plans can include additional features like reconciliation categories with alerts, multi-user notifications, and advanced configuration options.
          </p>
        </div>
        
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Is my data secure?
          </h3>
          <p class="text-gray-600 dark:text-gray-300">
            Absolutely. All data processing happens locally in your browser, ensuring maximum privacy. We do not store or transmit your data to our servers. For Enterprise plans with cloud processing, we use industry-standard encryption and security practices.
          </p>
        </div>
        
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            What are the advanced features in the Pro and Enterprise plans?
          </h3>
          <p class="text-gray-600 dark:text-gray-300">
            Pro plans include powerful features like reverse reconciliation, duplicate handling in comparison files, continuous comparison after failures, and results history. Enterprise adds even more capabilities like multiple concurrent reconciliations, reconciliation categories with alerts, advanced configuration options (case sensitivity, whitespace preservation, auto column combining), and multi-user notifications for team collaboration.
          </p>
        </div>
      </div>
    </div>

    <!-- CTA Section -->
    <div class="text-center">
      <h2 class="text-3xl font-bold mb-6 text-gray-900 dark:text-white">
        Ready to transform your data reconciliation?
      </h2>
      <div class="flex flex-col sm:flex-row justify-center gap-4">
        <button 
          on:click={() => goto('/upload')}
          class="px-8 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition duration-300"
        >
          Start Free Trial
        </button>
        <button 
          on:click={contactSales}
          class="px-8 py-3 rounded-lg bg-white hover:bg-gray-100 text-blue-600 font-semibold border border-blue-600 transition duration-300 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-blue-400 dark:border-blue-400"
        >
          Contact Sales
        </button>
      </div>
    </div>
  </div>
</div>