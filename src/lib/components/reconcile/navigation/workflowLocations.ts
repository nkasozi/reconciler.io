import type { StartMode } from '../start/startModes';
import type { WorkflowSession } from '../workflow/workflowSession.svelte';
import { createStartLocation, type AppLocation } from './appLocation';

type SessionSnapshot = WorkflowSession['session'];

const MAP_LOCATION: AppLocation = { view: 'map', stepNumber: null, startMode: 'two_files' };

export function readSessionLocation(session: SessionSnapshot, startMode: StartMode): AppLocation | null {
	const activeStepNumber = session.stages.find((stage) => stage.stageId === session.activeStageId)?.stageNumber ?? null;
	const reconciliationId = session.reconciliationId;
	switch (session.screenState) {
		case 'choosing_files':
			return createStartLocation(startMode);
		case 'workflow_map':
			return { ...MAP_LOCATION, reconciliationId };
		case 'linking':
			return activeStepNumber ? { view: 'links', stepNumber: activeStepNumber, startMode: 'two_files', reconciliationId } : null;
		case 'showing_results':
			return activeStepNumber ? { view: 'results', stepNumber: activeStepNumber, startMode: 'two_files', reconciliationId } : null;
		default:
			return null;
	}
}

function chooseFallbackLocation(session: SessionSnapshot): AppLocation {
	return session.files.length >= 2 && session.stages.length > 0 ? { ...MAP_LOCATION, reconciliationId: session.reconciliationId } : createStartLocation();
}

export function applyLocationToWorkflow(workflow: WorkflowSession, requestedLocation: AppLocation): AppLocation {
	const { session } = workflow;
	const requestedStage = session.stages.find((stage) => stage.stageNumber === requestedLocation.stepNumber);
	console.log(`[workflowLocations] Going to ${requestedLocation.view}${requestedLocation.stepNumber ? ` of step ${requestedLocation.stepNumber}` : ''}`);
	switch (requestedLocation.view) {
		case 'start':
			session.screenState = 'choosing_files';
			return requestedLocation;
		case 'map':
			if (session.files.length < 2) return applyLocationToWorkflow(workflow, createStartLocation());
			workflow.showWorkflowMap();
			return { ...requestedLocation, reconciliationId: session.reconciliationId };
		case 'links':
			if (!requestedStage) return applyLocationToWorkflow(workflow, chooseFallbackLocation(session));
			session.activeStageId = requestedStage.stageId;
			session.screenState = 'linking';
			return { ...requestedLocation, reconciliationId: session.reconciliationId };
		case 'results':
			if (!requestedStage) return applyLocationToWorkflow(workflow, chooseFallbackLocation(session));
			if (!requestedStage.runSummary) return applyLocationToWorkflow(workflow, { ...requestedLocation, view: 'links' });
			workflow.openStage(requestedStage.stageId);
			return { ...requestedLocation, reconciliationId: session.reconciliationId };
	}
}

export function chooseLandingLocation(session: SessionSnapshot): AppLocation {
	const reconciliationId = session.reconciliationId;
	const latestRanStage = [...session.stages].filter((stage) => stage.runSummary).sort((first, second) => second.stageNumber - first.stageNumber)[0];
	if (latestRanStage) return { view: 'results', stepNumber: latestRanStage.stageNumber, startMode: 'two_files', reconciliationId };
	if (session.stages.length > 1) return { ...MAP_LOCATION, reconciliationId };
	return session.stages.length === 1 ? { view: 'links', stepNumber: 1, startMode: 'two_files', reconciliationId } : createStartLocation();
}
