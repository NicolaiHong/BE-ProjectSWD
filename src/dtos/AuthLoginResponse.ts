import { UserPublicDto } from "./UserPublicDto";
import { AuthTokensResponse } from "./AuthTokensResponse";

export interface AuthLoginResponse {
  user: UserPublicDto;
  tokens: AuthTokensResponse;
}
