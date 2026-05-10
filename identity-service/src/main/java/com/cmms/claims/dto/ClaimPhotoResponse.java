package com.cmms.claims.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ClaimPhotoResponse {
    private Integer photoId;
    private Integer claimId;
    private String originalName;
    private String filePath;
    private String contentType;
    private Long fileSize;
    private LocalDateTime uploadedAt;
    private String uploadedBy;
}
