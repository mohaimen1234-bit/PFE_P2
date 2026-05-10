package com.cmms.claims.service;

import com.cmms.claims.dto.ClaimPhotoResponse;
import com.cmms.claims.entity.Claim;
import com.cmms.claims.entity.ClaimPhoto;
import com.cmms.claims.entity.ClaimStatus;
import com.cmms.claims.exception.ResourceNotFoundException;
import com.cmms.claims.repository.ClaimPhotoRepository;
import com.cmms.claims.repository.ClaimRepository;
import com.cmms.identity.security.UserPrincipal;
import com.cmms.identity.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ClaimPhotoService {

    private static final String ROLE_ADMIN = "ADMIN";
    private static final String ROLE_MAINTENANCE_MANAGER = "MAINTENANCE_MANAGER";

    private static final String ENTITY_NAME = "Claim";

    private final ClaimRepository claimRepository;
    private final ClaimPhotoRepository claimPhotoRepository;
    private final AuditLogService auditLogService;

    @Value("${storage.claim-photos-location:uploads/claim-photos}")
    private String storageLocation;

    @Transactional
    public ClaimPhotoResponse upload(Integer claimId, MultipartFile file) throws IOException {
        Actor actor = getCurrentActorRequired();
        Claim claim = getClaimOrThrow(claimId);
        assertCanManagePhotos(claim, actor);

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is required");
        }

        String contentType = file.getContentType();
        if (contentType != null && !contentType.toLowerCase().startsWith("image/")) {
            throw new IllegalArgumentException("Only image uploads are allowed");
        }

        Path root = Paths.get(storageLocation);
        Path claimDir = root.resolve("claim-" + claimId);
        if (!Files.exists(claimDir)) {
            Files.createDirectories(claimDir);
        }

        String originalName = file.getOriginalFilename();
        String safeName = originalName == null ? "upload" : originalName.replaceAll("[\\r\\n\\t]", "_");
        String uniqueFileName = UUID.randomUUID() + "_" + safeName;
        Path destination = claimDir.resolve(uniqueFileName);

        Files.copy(file.getInputStream(), destination);

        ClaimPhoto photo = ClaimPhoto.builder()
                .claimId(claimId)
                .photoUrl(destination.toString())
                .originalName(originalName)
                .filePath(destination.toString())
                .contentType(contentType)
                .fileSize(file.getSize())
                .uploadedAt(LocalDateTime.now())
                .uploadedBy(actor.displayName)
                .build();

        ClaimPhoto saved = claimPhotoRepository.save(photo);

        auditLogService.log(
                actor.userId,
                actor.displayName,
                "UPLOAD_CLAIM_PHOTO",
                ENTITY_NAME,
                claimId,
                "Uploaded claim photo: " + (originalName == null ? saved.getPhotoId() : originalName)
        );

        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<ClaimPhotoResponse> list(Integer claimId) {
        Actor actor = getCurrentActorRequired();
        Claim claim = getClaimOrThrow(claimId);
        assertCanView(claim, actor);

        return claimPhotoRepository.findByClaimId(claimId).stream()
                .sorted(Comparator.comparing(ClaimPhoto::getUploadedAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public void delete(Integer claimId, Integer photoId) {
        Actor actor = getCurrentActorRequired();
        Claim claim = getClaimOrThrow(claimId);
        assertCanManagePhotos(claim, actor);

        ClaimPhoto photo = claimPhotoRepository.findById(photoId)
                .orElseThrow(() -> new ResourceNotFoundException("Photo not found with ID: " + photoId));

        if (!Objects.equals(photo.getClaimId(), claimId)) {
            throw new IllegalArgumentException("Photo does not belong to the specified claim");
        }

        String filePath = photo.getFilePath();
        claimPhotoRepository.delete(photo);

        if (filePath != null && !filePath.isBlank()) {
            try {
                Files.deleteIfExists(Paths.get(filePath));
            } catch (IOException ignored) {
                // Best-effort cleanup
            }
        }

        auditLogService.log(
                actor.userId,
                actor.displayName,
                "DELETE_CLAIM_PHOTO",
                ENTITY_NAME,
                claimId,
                "Deleted claim photo: " + photoId
        );
    }

    @Transactional(readOnly = true)
    public PhotoFile loadFile(Integer claimId, Integer photoId) {
        Actor actor = getCurrentActorRequired();
        Claim claim = getClaimOrThrow(claimId);
        assertCanView(claim, actor);

        ClaimPhoto photo = claimPhotoRepository.findById(photoId)
                .orElseThrow(() -> new ResourceNotFoundException("Photo not found with ID: " + photoId));

        if (!Objects.equals(photo.getClaimId(), claimId)) {
            throw new IllegalArgumentException("Photo does not belong to the specified claim");
        }

        String filePath = photo.getFilePath();
        if (filePath == null || filePath.isBlank()) {
            throw new ResourceNotFoundException("Photo file not found for ID: " + photoId);
        }

        Path path = Paths.get(filePath);
        if (!Files.exists(path)) {
            throw new ResourceNotFoundException("Photo file not found for ID: " + photoId);
        }

        return new PhotoFile(path, photo.getContentType(), photo.getOriginalName());
    }

    private ClaimPhotoResponse toResponse(ClaimPhoto photo) {
        return ClaimPhotoResponse.builder()
                .photoId(photo.getPhotoId())
                .claimId(photo.getClaimId())
                .originalName(photo.getOriginalName())
                .filePath(photo.getFilePath())
                .contentType(photo.getContentType())
                .fileSize(photo.getFileSize())
                .uploadedAt(photo.getUploadedAt())
                .uploadedBy(photo.getUploadedBy())
                .build();
    }

    private Claim getClaimOrThrow(Integer claimId) {
        return claimRepository.findById(claimId)
                .orElseThrow(() -> new ResourceNotFoundException("Claim not found with ID: " + claimId));
    }

    private void assertCanView(Claim claim, Actor actor) {
        if (actor.isAdminOrManager()) {
            return;
        }
        if (actor.userId != null && Objects.equals(actor.userId, claim.getRequesterId())) {
            return;
        }
        if (actor.userId != null && Objects.equals(actor.userId, claim.getAssignedToUserId())) {
            return;
        }
        throw new AccessDeniedException("Not allowed to view this claim");
    }

    private void assertCanManagePhotos(Claim claim, Actor actor) {
        // Allow admins/managers always; allow requester and assigned technician.
        assertCanView(claim, actor);

        if (claim.getStatus() == ClaimStatus.CLOSED) {
            // Keep this as a workflow-friendly constraint.
            throw new IllegalStateException("Closed claims cannot be modified");
        }
    }

    private static Actor getCurrentActorRequired() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new AccessDeniedException("Authentication required");
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof UserPrincipal userPrincipal) {
            Integer userId = userPrincipal.getUser() == null ? null : userPrincipal.getUser().getUserId();
            String displayName = userPrincipal.getUser() == null ? null : userPrincipal.getUser().getFullName();
            if (displayName == null || displayName.isBlank()) {
                displayName = userPrincipal.getUsername();
            }
            List<String> roles = userPrincipal.getUser() == null ? List.of() : userPrincipal.getUser().getRoles().stream()
                    .map(r -> r.getRoleName().toUpperCase())
                    .collect(java.util.stream.Collectors.toList());
            return new Actor(userId, displayName, roles);
        }

        return new Actor(null, authentication.getName(), List.of());
    }

    private record Actor(Integer userId, String displayName, List<String> roles) {
        boolean isAdminOrManager() {
            return roles.contains(ROLE_ADMIN) || roles.contains(ROLE_MAINTENANCE_MANAGER);
        }
    }

    public record PhotoFile(Path path, String contentType, String fileName) {
    }
}
