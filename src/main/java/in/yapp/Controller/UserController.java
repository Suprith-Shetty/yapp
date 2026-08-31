package in.yapp.Controller;

import in.yapp.DTO.UserProfileDTO;
import in.yapp.DTO.UserSearchResponseDTO;
import in.yapp.Service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    @GetMapping("/search")
    public List<UserSearchResponseDTO> searchUser(
            @RequestParam String username) {

        return userService.searchByUsername(username);
    }



    @GetMapping("/{userId}/presence")
    public Map<String, Object> getPresence(
            @PathVariable UUID userId) {

        return userService.getPresence(userId);
    }


    @GetMapping("/{userId}/profile")
    public UserProfileDTO getProfile(
            @PathVariable UUID userId) {

        return userService.getProfile(userId);
    }


    @PostMapping("/me/profile-picture")
    public UserProfileDTO uploadProfilePicture(
            @RequestParam("file") MultipartFile file,
            Principal principal) throws Exception {

        return userService.uploadProfilePicture(
                file,
                principal
        );
    }

    @DeleteMapping("/me/profile-picture")
    public UserProfileDTO removeProfilePicture(
            Principal principal) {

        return userService.removeProfilePicture(principal);
    }


}