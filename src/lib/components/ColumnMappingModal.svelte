<script lang="ts">
    import { onMount, createEventDispatcher } from 'svelte';
    import type { ParsedFileData } from '$lib/utils/fileParser';
    import type { ColumnPair } from '$lib/utils/reconciliation';
    
    // Props using the new $props() rune
    const props = $props<{
        primaryFile: ParsedFileData;
        comparisonFile: ParsedFileData;
        show?: boolean;
    }>();
    
    // Provide default for optional prop
    const show = $derived(props.show ?? false);
    
    // Setup event dispatcher
    const dispatch = createEventDispatcher();
    
    // Column mapping state
    let primaryIdPair = $state<ColumnPair>({
        primaryColumn: null,
        comparisonColumn: null
    });
    
    let comparisonPairs = $state<ColumnPair[]>([
        { primaryColumn: null, comparisonColumn: null }
    ]);
    
    // Selected columns for mapping
    let selectedPrimaryColumn = $state<string | null>(null);
    let selectedComparisonColumn = $state<string | null>(null);
    let currentMappingType = $state<'id' | 'comparison'>('id');
    let currentPairIndex = $state<number>(0);
    
    // Validation state
    let primaryIdPairValid = $state(false);
    let formValid = $state(false);
    
    onMount(() => {
        // Add event listeners for modal keyboard navigation
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && show) {
                close();
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    });
    
    // Validation
    $effect(() => {
        primaryIdPairValid = !!primaryIdPair.primaryColumn && !!primaryIdPair.comparisonColumn;
        validateForm();
    });
    
    function validateForm() {
        // Check if primary ID pair is valid
        const validComparisonPairs = comparisonPairs.filter(
            pair => pair.primaryColumn && pair.comparisonColumn
        ).length > 0;
        
        formValid = primaryIdPairValid && validComparisonPairs;
    }
    
    // Add another comparison pair
    function addComparisonPair() {
        const newPairIndex = comparisonPairs.length;
        comparisonPairs = [...comparisonPairs, { primaryColumn: null, comparisonColumn: null }];
        
        // Automatically switch to editing the new pair
        setMappingContext('comparison', newPairIndex);
    }
    
    // Remove a comparison pair
    function removeComparisonPair(index: number) {
        // Remove the pair from the array
        comparisonPairs = comparisonPairs.filter((_, i) => i !== index);
        
        // If we removed the currently active pair, select a different one
        if (currentMappingType === 'comparison' && currentPairIndex === index) {
            const newIndex = Math.min(index, comparisonPairs.length - 1);
            if (newIndex >= 0) {
                setMappingContext('comparison', newIndex);
            } else {
                // If no comparison pairs left, switch to ID mapping
                setMappingContext('id');
            }
        } else if (currentMappingType === 'comparison' && currentPairIndex > index) {
            // If we're editing a pair that comes after the removed one, adjust the index
            setMappingContext('comparison', currentPairIndex - 1);
        }
    }
    
    // Handle column selection for mapping
    function selectColumn(column: string, fileType: 'primary' | 'comparison') {
        if (fileType === 'primary') {
            selectedPrimaryColumn = column;
            
            // If a comparison column is already selected, create the connection
            if (selectedComparisonColumn) {
                createConnection();
            }
        } else {
            selectedComparisonColumn = column;
            
            // If a primary column is already selected, create the connection
            if (selectedPrimaryColumn) {
                createConnection();
            }
        }
    }
    
    // Create a connection between selected columns
    function createConnection() {
        if (!selectedPrimaryColumn || !selectedComparisonColumn) return;
        
        // Update the appropriate pair based on mapping type
        if (currentMappingType === 'id') {
            // Update the ID pair
            primaryIdPair = {
                primaryColumn: selectedPrimaryColumn,
                comparisonColumn: selectedComparisonColumn
            };
        } else {
            // Update the specific comparison pair
            comparisonPairs = comparisonPairs.map((pair, index) => {
                if (index === currentPairIndex) {
                    return {
                        primaryColumn: selectedPrimaryColumn,
                        comparisonColumn: selectedComparisonColumn
                    };
                }
                return pair;
            });
        }
        
        // Reset selected columns
        selectedPrimaryColumn = null;
        selectedComparisonColumn = null;
        
        // Validate form after connection is made
        validateForm();
    }
    
    // Set the current mapping type and pair index
    function setMappingContext(type: 'id' | 'comparison', index = 0) {
        currentMappingType = type;
        currentPairIndex = index;
        
        // Clear any currently selected columns
        selectedPrimaryColumn = null;
        selectedComparisonColumn = null;
    }
    
    // Close the modal
    function close() {
        dispatch('close');
    }
    
    // Apply the mapping and move to next step
    function applyMapping() {
        if (!formValid) return;
        
        // Filter out any incomplete comparison pairs
        const validComparisonPairs = comparisonPairs.filter(
            pair => pair.primaryColumn && pair.comparisonColumn
        );
        
        // Dispatch the mapping data
        dispatch('mapping', {
            primaryIdPair,
            comparisonPairs: validComparisonPairs
        });
        
        // Close the modal
        close();
    }
    
    // Compute whether a column is currently selected
    function isColumnSelected(column: string, fileType: 'primary' | 'comparison'): boolean {
        if (fileType === 'primary') {
            return selectedPrimaryColumn === column;
        } else {
            return selectedComparisonColumn === column;
        }
    }
    
    // Compute whether a column is used in any connection
    function isColumnUsed(column: string, fileType: 'primary' | 'comparison'): boolean {
        if (fileType === 'primary') {
            if (primaryIdPair.primaryColumn === column) return true;
            return comparisonPairs.some(pair => pair.primaryColumn === column);
        } else {
            if (primaryIdPair.comparisonColumn === column) return true;
            return comparisonPairs.some(pair => pair.comparisonColumn === column);
        }
    }
    
    // Get a string describing what a column is used for
    function getColumnUsageDescription(column: string, fileType: 'primary' | 'comparison'): string {
        if (fileType === 'primary') {
            if (primaryIdPair.primaryColumn === column) return 'Primary ID';
            
            const pairIndex = comparisonPairs.findIndex(pair => pair.primaryColumn === column);
            if (pairIndex >= 0) return `Comparison #${pairIndex + 1}`;
        } else {
            if (primaryIdPair.comparisonColumn === column) return 'Primary ID';
            
            const pairIndex = comparisonPairs.findIndex(pair => pair.comparisonColumn === column);
            if (pairIndex >= 0) return `Comparison #${pairIndex + 1}`;
        }
        
        return '';
    }

    // Compute display name for selected columns
    function getSelectedColumnText(): string {
        let text = '';
        
        if (currentMappingType === 'id') {
            text = 'Primary ID Columns';
            
            if (primaryIdPair.primaryColumn && primaryIdPair.comparisonColumn) {
                text += `: ${primaryIdPair.primaryColumn} → ${primaryIdPair.comparisonColumn}`;
            }
        } else {
            text = `Comparison Pair #${currentPairIndex + 1}`;
            
            const pair = comparisonPairs[currentPairIndex];
            if (pair && pair.primaryColumn && pair.comparisonColumn) {
                text += `: ${pair.primaryColumn} → ${pair.comparisonColumn}`;
            }
        }
        
        return text;
    }
</script>

<!-- Modal backdrop -->
{#if show}
    <div 
        class="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4"
        on:click={close}
    >
        <!-- Modal content -->
        <div 
            id="column-mapping-modal"
            class="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
            on:click|stopPropagation={() => {}}
        >
            <!-- Modal header -->
            <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700">
                <h2 class="text-xl font-bold text-gray-900 dark:text-white">
                    Column Mapping
                </h2>
                <button 
                    class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 focus:outline-none"
                    on:click={close}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            
            <!-- Modal body -->
            <div class="p-6 flex-1 overflow-auto">
                <!-- Current mapping indicator -->
                <div class="mb-4 bg-blue-50 dark:bg-blue-900 p-3 rounded-md border border-blue-200 dark:border-blue-800">
                    <div class="flex items-center">
                        <div class="mr-2 flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-600 dark:text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                            </svg>
                        </div>
                        <p class="text-sm text-blue-800 dark:text-blue-200">
                            {#if selectedPrimaryColumn || selectedComparisonColumn}
                                Currently selecting: {selectedPrimaryColumn || selectedComparisonColumn}
                            {:else}
                                Currently mapping: {getSelectedColumnText()}
                            {/if}
                        </p>
                    </div>
                </div>
                
                <!-- File column selection area -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
                    <!-- Primary file columns -->
                    <div>
                        <h3 class="text-lg font-bold text-gray-800 dark:text-white mb-3 flex items-center">
                            <span class="h-3 w-3 rounded-full bg-green-500 mr-2"></span>
                            Primary File Columns
                        </h3>
                        <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-md max-h-[50vh] overflow-y-auto">
                            {#each props.primaryFile.columns as column}
                                <div 
                                    class="py-2 px-3 mb-2 rounded-md border cursor-pointer transition-colors flex justify-between items-center"
                                    class:bg-blue-50={isColumnSelected(column, 'primary')}
                                    class:border-blue-300={isColumnSelected(column, 'primary')}
                                    class:dark:bg-blue-900={isColumnSelected(column, 'primary')}
                                    class:dark:border-blue-700={isColumnSelected(column, 'primary')}
                                    class:bg-white={!isColumnSelected(column, 'primary')}
                                    class:border-gray-200={!isColumnSelected(column, 'primary')}
                                    class:dark:bg-gray-800={!isColumnSelected(column, 'primary')}
                                    class:dark:border-gray-600={!isColumnSelected(column, 'primary')}
                                    class:hover:bg-gray-100={!isColumnSelected(column, 'primary')}
                                    class:dark:hover:bg-gray-700={!isColumnSelected(column, 'primary')}
                                    on:click={() => selectColumn(column, 'primary')}
                                >
                                    <div>
                                        <span class="font-medium text-gray-800 dark:text-white">{column}</span>
                                        {#if isColumnUsed(column, 'primary')}
                                            <span class="ml-2 inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                                                {getColumnUsageDescription(column, 'primary')}
                                            </span>
                                        {/if}
                                    </div>
                                    
                                    {#if isColumnSelected(column, 'primary')}
                                        <span class="h-2 w-2 rounded-full bg-blue-500"></span>
                                    {/if}
                                </div>
                            {/each}
                        </div>
                    </div>
                    
                    <!-- Comparison file columns -->
                    <div>
                        <h3 class="text-lg font-bold text-gray-800 dark:text-white mb-3 flex items-center">
                            <span class="h-3 w-3 rounded-full bg-purple-500 mr-2"></span>
                            Comparison File Columns
                        </h3>
                        <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-md max-h-[50vh] overflow-y-auto">
                            {#each props.comparisonFile.columns as column}
                                <div 
                                    class="py-2 px-3 mb-2 rounded-md border cursor-pointer transition-colors flex justify-between items-center"
                                    class:bg-blue-50={isColumnSelected(column, 'comparison')}
                                    class:border-blue-300={isColumnSelected(column, 'comparison')}
                                    class:dark:bg-blue-900={isColumnSelected(column, 'comparison')}
                                    class:dark:border-blue-700={isColumnSelected(column, 'comparison')}
                                    class:bg-white={!isColumnSelected(column, 'comparison')}
                                    class:border-gray-200={!isColumnSelected(column, 'comparison')}
                                    class:dark:bg-gray-800={!isColumnSelected(column, 'comparison')}
                                    class:dark:border-gray-600={!isColumnSelected(column, 'comparison')}
                                    class:hover:bg-gray-100={!isColumnSelected(column, 'comparison')}
                                    class:dark:hover:bg-gray-700={!isColumnSelected(column, 'comparison')}
                                    on:click={() => selectColumn(column, 'comparison')}
                                >
                                    <div>
                                        <span class="font-medium text-gray-800 dark:text-white">{column}</span>
                                        {#if isColumnUsed(column, 'comparison')}
                                            <span class="ml-2 inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                                                {getColumnUsageDescription(column, 'comparison')}
                                            </span>
                                        {/if}
                                    </div>
                                    
                                    {#if isColumnSelected(column, 'comparison')}
                                        <span class="h-2 w-2 rounded-full bg-blue-500"></span>
                                    {/if}
                                </div>
                            {/each}
                        </div>
                    </div>
                </div>
                
                <!-- Mapping controls -->
                <div class="mt-8 space-y-4">
                    <!-- ID Column pair -->
                    <div class="bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-md border border-indigo-200 dark:border-indigo-800">
                        <div class="flex justify-between items-center mb-2">
                            <h3 class="font-bold text-indigo-800 dark:text-indigo-300">Primary ID Column Mapping</h3>
                            <button 
                                type="button"
                                class="px-3 py-1 text-sm font-medium rounded-md bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-800 dark:text-indigo-200 dark:hover:bg-indigo-700 transition"
                                on:click={() => setMappingContext('id')}
                            >
                                {primaryIdPair.primaryColumn && primaryIdPair.comparisonColumn ? 'Edit Mapping' : 'Set Mapping'}
                            </button>
                        </div>
                        
                        <p class="text-sm text-indigo-700 dark:text-indigo-300 mb-2">
                            These columns uniquely identify records in each file and will be used to match rows.
                        </p>
                        
                        {#if primaryIdPair.primaryColumn && primaryIdPair.comparisonColumn}
                            <div class="flex items-center space-x-2 text-sm">
                                <span class="font-medium text-indigo-700 dark:text-indigo-300">{primaryIdPair.primaryColumn}</span>
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clip-rule="evenodd" />
                                </svg>
                                <span class="font-medium text-indigo-700 dark:text-indigo-300">{primaryIdPair.comparisonColumn}</span>
                            </div>
                        {:else}
                            <div class="text-sm text-indigo-700 dark:text-indigo-300 italic">
                                No ID columns mapped yet
                            </div>
                        {/if}
                    </div>
                    
                    <!-- Comparison column pairs -->
                    <div>
                        <div class="flex justify-between items-center mb-2">
                            <h3 class="font-bold text-gray-800 dark:text-white">Comparison Column Pairs</h3>
                            <button 
                                type="button"
                                class="px-3 py-1 text-sm font-medium rounded-md bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-800 dark:text-green-200 dark:hover:bg-green-700 transition"
                                on:click={addComparisonPair}
                            >
                                + Add Pair
                            </button>
                        </div>
                        
                        {#if comparisonPairs.length === 0}
                            <p class="text-sm text-gray-500 dark:text-gray-400 italic">
                                No comparison pairs added yet
                            </p>
                        {:else}
                            <div class="space-y-3">
                                {#each comparisonPairs as pair, index}
                                    <div class="bg-gray-50 dark:bg-gray-700 p-3 rounded-md border border-gray-200 dark:border-gray-600">
                                        <div class="flex justify-between items-center mb-1">
                                            <h4 class="font-medium text-gray-800 dark:text-white">Comparison Pair #{index + 1}</h4>
                                            <div class="flex space-x-2">
                                                <button 
                                                    type="button"
                                                    class="px-2 py-1 text-xs font-medium rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-800 dark:text-blue-200 dark:hover:bg-blue-700 transition"
                                                    on:click={() => setMappingContext('comparison', index)}
                                                >
                                                    {pair.primaryColumn && pair.comparisonColumn ? 'Edit' : 'Set'}
                                                </button>
                                                {#if comparisonPairs.length > 1}
                                                    <button 
                                                        type="button"
                                                        class="px-2 py-1 text-xs font-medium rounded-md bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-800 dark:text-red-200 dark:hover:bg-red-700 transition"
                                                        on:click={() => removeComparisonPair(index)}
                                                    >
                                                        Remove
                                                    </button>
                                                {/if}
                                            </div>
                                        </div>
                                        
                                        {#if pair.primaryColumn && pair.comparisonColumn}
                                            <div class="flex items-center space-x-2 text-sm">
                                                <span class="font-medium text-gray-700 dark:text-gray-300">{pair.primaryColumn}</span>
                                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fill-rule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clip-rule="evenodd" />
                                                </svg>
                                                <span class="font-medium text-gray-700 dark:text-gray-300">{pair.comparisonColumn}</span>
                                            </div>
                                        {:else}
                                            <div class="text-sm text-gray-500 dark:text-gray-400 italic">
                                                No columns mapped yet
                                            </div>
                                        {/if}
                                    </div>
                                {/each}
                            </div>
                        {/if}
                    </div>
                </div>
            </div>
            
            <!-- Modal footer -->
            <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700">
                <button 
                    class="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600 transition"
                    on:click={close}
                >
                    Cancel
                </button>
                
                <button 
                    class="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition"
                    disabled={!formValid}
                    class:opacity-50={!formValid}
                    class:cursor-not-allowed={!formValid}
                    on:click={applyMapping}
                >
                    Apply & Continue
                </button>
            </div>
        </div>
    </div>
{/if}

<style>
    /* Animation for the modal */
    .fixed {
        animation: fadeIn 0.2s ease-out;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
</style>