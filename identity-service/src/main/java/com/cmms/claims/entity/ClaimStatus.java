package com.cmms.claims.entity;

public enum ClaimStatus {
    /** Newly submitted, not yet evaluated */
    NEW,
    /** Evaluated and confirmed as legitimate */
    QUALIFIED,
    /** Assigned to a technician for investigation */
    ASSIGNED,
    /** A Work Order has been created from this claim */
    CONVERTED_TO_WORK_ORDER,
    /** Active maintenance in progress (technician working) */
    IN_PROGRESS,
    /** Work completed, pending final closure confirmation */
    RESOLVED,
    /** Fully closed and archived */
    CLOSED,
    /** Rejected as invalid / duplicate / out of scope */
    REJECTED
}
