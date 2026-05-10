package com.cmms.maintenance.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TechnicianRecommendationDTO {
    private Integer userId;
    private String fullName;
    private String departmentName;
    private String availabilityStatus; // Available, Partially Available, Busy, Overloaded
    private double workloadScore;
    private int activeTasksCount;
    private List<String> badges; // e.g., Best Match, Same Department, Qualified
    private double finalRankScore; // Used internally for sorting, optional in frontend
}
