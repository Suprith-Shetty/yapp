package in.yapp.DTO;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.UUID;


@Getter
@AllArgsConstructor
public class UserSearchResponseDTO
{

    private UUID id;
    private String username;
    private String displayName;

}
