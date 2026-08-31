package in.yapp.Service;


import in.yapp.DTO.UserProfileDTO;
import in.yapp.DTO.UserSearchResponseDTO;
import in.yapp.Entity.User;
import in.yapp.Repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService
{
    private final UserRepository userRepository;
    private final FileService fileService;

    public List<UserSearchResponseDTO> searchByUsername(String username) {

        return userRepository
                .findByUserNameContainingIgnoreCase(username)
                .stream()
                .map(user -> new UserSearchResponseDTO(
                        user.getId(),
                        user.getUserName(),
                        user.getDisplayName()
                ))
                .toList();
    }

    public Map<String, Object> getPresence(UUID userId) {

        return userRepository.findById(userId)
                .map(user -> Map.<String, Object>of(
                        "userId", user.getId(),
                        "username", user.getUserName(),
                        "online", user.isOnline(),
                        "lastSeen",
                        user.getLastSeen() != null
                                ? user.getLastSeen()
                                : ""
                ))
                .orElseGet(() -> Map.of(
                        "userId", userId,
                        "username", "",
                        "online", false,
                        "lastSeen", ""
                ));
    }

    public UserProfileDTO getProfile(UUID userId) {

        User user = userRepository.findById(userId)
                .orElseThrow(() ->
                        new RuntimeException("User not found")
                );

        return new UserProfileDTO(
                user.getId(),
                user.getUserName(),
                user.getDisplayName(),
                user.getProfilePictureUrl(),
                user.isOnline(),
                user.getLastSeen()
        );
    }


    public UserProfileDTO uploadProfilePicture(
            MultipartFile file,
            Principal principal) throws Exception {

        if (file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }

        if (!file.getContentType().startsWith("image/")) {
            throw new IllegalArgumentException(
                    "Only images are allowed"
            );
        }

        if (file.getSize() > 10L * 1024 * 1024) {
            throw new IllegalArgumentException(
                    "Profile picture cannot exceed 10 MB"
            );
        }

        UUID userId =
                UUID.fromString(principal.getName());

        User user =
                userRepository.findById(userId)
                        .orElseThrow(() ->
                                new RuntimeException("User not found")
                        );

        Map<String, Object> uploadResult =
                fileService.uploadFile(file);

        String fileUrl =
                (String) uploadResult.get("secure_url");

        user.setProfilePictureUrl(fileUrl);

        userRepository.save(user);

        return new UserProfileDTO(
                user.getId(),
                user.getUserName(),
                user.getDisplayName(),
                user.getProfilePictureUrl(),
                user.isOnline(),
                user.getLastSeen()
        );
    }

    public UserProfileDTO removeProfilePicture(Principal principal) {

        UUID userId = UUID.fromString(principal.getName());

        User user = userRepository.findById(userId)
                .orElseThrow(() ->
                        new RuntimeException("User not found")
                );

        user.setProfilePictureUrl(null);

        userRepository.save(user);

        return toProfileDTO(user);
    }




    private UserProfileDTO toProfileDTO(User user) {

        return new UserProfileDTO(
                user.getId(),
                user.getUserName(),
                user.getDisplayName(),
                user.getProfilePictureUrl(),
                user.isOnline(),
                user.getLastSeen()
        );
    }


}
