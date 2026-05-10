package com.cmms.equipment.entity;

public enum EquipmentStatus {
    OPERATIONAL,
    OUT_OF_SERVICE,
    REFORMED,
    UNDER_REPAIR,   // Legacy, kept for backward compatibility
    ARCHIVED        // Legacy, kept for backward compatibility
}
