package com.cmms.inventory.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UsePartRequest {
    @NotNull
    private Integer woId;
    
    private Integer taskId; // Optional: Link to a specific step
    
    @NotNull
    private Integer partId;
    
    @NotNull
    @Min(1)
    private Integer quantity;
}
