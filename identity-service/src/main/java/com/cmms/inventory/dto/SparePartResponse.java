package com.cmms.inventory.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SparePartResponse {
    private Integer partId;
    private String name;
    private String sku;
    private String category;
    private Integer quantityInStock;
    private Integer minStockLevel;
    private BigDecimal unitCost;
    private String location;
    private String supplier;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
