export type AccessTokenClaims = {
  sub: string;
  tid: string;
  roles: string[];
  permissions: string[];
  typ: 'access';
};

export type RequestAuthContext = {
  userId: string;
  tenantId: string;
  roles: string[];
  permissions: string[];
};
