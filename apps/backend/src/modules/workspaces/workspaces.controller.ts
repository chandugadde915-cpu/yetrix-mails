import { Body, Controller, Delete, Get, Param, Put, Post, Req } from "@nestjs/common";
import { AuthenticatedRequest } from "../../common/auth.middleware";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UpdateWorkspaceDto } from "./dto/update-workspace.dto";
import { WorkspacesService } from "./workspaces.service";

@Controller("api")
export class WorkspacesController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Get("workspace")
  getWorkspace(@Req() req: AuthenticatedRequest) {
    return this.workspaces.getWorkspace(req.user?.workspaceId);
  }

  @Put("workspace")
  updateWorkspace(@Req() req: AuthenticatedRequest, @Body() body: UpdateWorkspaceDto) {
    return this.workspaces.updateWorkspace(req.user?.workspaceId, body.name);
  }

  @Get("users")
  listUsers(@Req() req: AuthenticatedRequest) {
    return this.workspaces.listUsers(req.user?.workspaceId);
  }

  @Post("users")
  createUser(@Req() req: AuthenticatedRequest, @Body() body: CreateUserDto) {
    return this.workspaces.createUser(req.user?.workspaceId, body);
  }

  @Put("users/:id")
  updateUser(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() body: UpdateUserDto) {
    return this.workspaces.updateUser(req.user?.workspaceId, id, body);
  }

  @Delete("users/:id")
  deleteUser(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.workspaces.deleteUser(req.user?.workspaceId, id);
  }
}
