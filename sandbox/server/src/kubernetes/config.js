/**
 * Kubernetes API client initialization.
 * Loads credentials from in-cluster ServiceAccount or KUBECONFIG.
 * Used for pod/service lifecycle orchestration.
 */

import *as k8s from "@kubernetes/client-node";

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

/**
 * Kubernetes Core V1 API client.
 * Gateway to pod and service operations.
 */
export const k8sCoreV1Api = kc.makeApiClient(k8s.CoreV1Api);