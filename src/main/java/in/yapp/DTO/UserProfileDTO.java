package in.yapp.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.UUID;

@Data
@AllArgsConstructor
public class UserProfileDTO {

    private UUID id;
    private String userName;
    private String displayName;
    private String profilePictureUrl;
    private boolean online;
    private java.time.Instant lastSeen;
}